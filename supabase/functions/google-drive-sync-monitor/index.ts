import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Starting Google Drive sync monitor...");

    // Get all active Google Drive connections
    const { data: connections, error: connectionsError } = await supabase
      .from('google_connections')
      .select('*')
      .not('selected_folder_id', 'is', null);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch connections' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`Found ${connections?.length || 0} active connections`);

    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each connection
    for (const connection of connections || []) {
      try {
        console.log(`Processing connection for user: ${connection.google_email}`);

        let accessToken = connection.access_token;

        // Check if token needs refresh
        if (new Date(connection.expires_at) <= new Date()) {
          console.log('Token expired, refreshing...');
          
          const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
              client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
              refresh_token: connection.refresh_token,
              grant_type: "refresh_token",
            }),
          });

          if (!refreshResponse.ok) {
            throw new Error('Failed to refresh Google access token');
          }

          const tokenData: TokenResponse = await refreshResponse.json();
          accessToken = tokenData.access_token;

          // Update token in database
          await supabase
            .from('google_connections')
            .update({
              access_token: tokenData.access_token,
              expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            })
            .eq('id', connection.id);

          console.log('Token refreshed successfully');
        }

        // Get files from the selected folder
        const driveResponse = await fetch(
          `${GOOGLE_DRIVE_FILES_URL}?q='${connection.selected_folder_id}' in parents and trashed=false&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=100`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!driveResponse.ok) {
          throw new Error(`Drive API error: ${driveResponse.status}`);
        }

        const driveData = await driveResponse.json();
        const files = driveData.files || [];

        console.log(`Found ${files.length} files in folder: ${connection.selected_folder_name}`);

        // Filter for supported document types
        const supportedFiles = files.filter((file: any) => 
          file.mimeType === 'application/pdf' ||
          file.mimeType === 'application/vnd.google-apps.document' ||
          file.mimeType === 'text/plain' ||
          file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );

        console.log(`${supportedFiles.length} supported files found`);

        // Check for new or modified files
        for (const file of supportedFiles) {
          try {
            // Check if file exists in our database
            const { data: existingDoc, error: docError } = await supabase
              .from('shared_documents')
              .select('*')
              .eq('file_name', file.name)
              .eq('uploaded_by', connection.user_id)
              .single();

            if (docError && docError.code !== 'PGRST116') {
              console.error('Error checking existing document:', docError);
              continue;
            }

            const fileModified = new Date(file.modifiedTime);
            const shouldProcess = !existingDoc || 
              (existingDoc.updated_at && new Date(existingDoc.updated_at) < fileModified);

            if (shouldProcess) {
              console.log(`Processing new/modified file: ${file.name}`);

              // Get file content
              const contentResponse = await fetch(
                `${GOOGLE_DRIVE_FILES_URL}/${file.id}/export?mimeType=text/plain`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );

              if (!contentResponse.ok) {
                // Try alternative export for non-Google docs
                const altResponse = await fetch(
                  `${GOOGLE_DRIVE_FILES_URL}/${file.id}?alt=media`,
                  {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  }
                );

                if (!altResponse.ok) {
                  throw new Error(`Failed to download file: ${file.name}`);
                }
              }

              // Create or update document record
              const docData = {
                file_name: file.name,
                file_path: `google-drive/${file.id}`,
                doc_title: file.name.replace(/\.[^/.]+$/, ''),
                document_category: 'google_drive_sync',
                training_priority: 1,
                file_size: parseInt(file.size) || null,
                mime_type: file.mimeType,
                uploaded_by: connection.user_id,
                processing_status: 'pending',
                updated_at: new Date().toISOString()
              };

              if (existingDoc) {
                // Update existing document
                await supabase
                  .from('shared_documents')
                  .update(docData)
                  .eq('id', existingDoc.id);

                console.log(`Updated document: ${file.name}`);
              } else {
                // Create new document
                const { data: newDoc, error: insertError } = await supabase
                  .from('shared_documents')
                  .insert(docData)
                  .select()
                  .single();

                if (insertError) {
                  throw insertError;
                }

                console.log(`Created new document: ${file.name}`);
              }

              // Trigger document processing
              const { error: processError } = await supabase.functions.invoke('process-shared-document', {
                body: {
                  documentId: existingDoc?.id || file.id,
                  filePath: `google-drive/${file.id}`,
                  googleDriveId: file.id,
                  accessToken: accessToken
                }
              });

              if (processError) {
                console.error('Document processing error:', processError);
              } else {
                console.log(`Processing started for: ${file.name}`);
              }

              totalProcessed++;
            }
          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
            totalErrors++;

            // Log error for monitoring
            await supabase.from('security_events').insert({
              event_type: 'google_drive_sync_file_error',
              event_data: {
                file_name: file.name,
                user_id: connection.user_id,
                error: (fileError as Error).message,
                timestamp: new Date().toISOString()
              }
            });
          }
        }

        // Update last sync time
        await supabase
          .from('google_connections')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', connection.id);

      } catch (connectionError) {
        console.error(`Error processing connection ${connection.id}:`, connectionError);
        totalErrors++;

        // Log connection error
        await supabase.from('security_events').insert({
          event_type: 'google_drive_sync_connection_error',
          event_data: {
            connection_id: connection.id,
            user_id: connection.user_id,
            error: (connectionError as Error).message,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    console.log(`Sync complete. Processed: ${totalProcessed}, Errors: ${totalErrors}`);

    // Log sync summary
    await supabase.from('security_events').insert({
      event_type: 'google_drive_sync_completed',
      event_data: {
        connections_processed: connections?.length || 0,
        files_processed: totalProcessed,
        errors: totalErrors,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      connections_processed: connections?.length || 0,
      files_processed: totalProcessed,
      errors: totalErrors
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Sync monitor error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
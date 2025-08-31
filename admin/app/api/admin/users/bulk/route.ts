import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { action, userIds, adminId, params } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    const results = [];
    
    for (const userId of userIds) {
      try {
        let result;
        
        switch (action) {
          case 'ban':
            result = await supabaseAdmin.rpc('ban_user', {
              target_user_id: userId,
              admin_user_id: adminId,
              reason: params?.reason || 'Bulk ban operation'
            });
            break;
            
          case 'unban':
            result = await supabaseAdmin.rpc('unban_user', {
              target_user_id: userId,
              admin_user_id: adminId
            });
            break;
            
          case 'activate':
            result = await supabaseAdmin.rpc('activate_user', {
              target_user_id: userId,
              admin_user_id: adminId
            });
            break;
            
          case 'deactivate':
            result = await supabaseAdmin.rpc('deactivate_user', {
              target_user_id: userId,
              admin_user_id: adminId
            });
            break;
            
          case 'change_role':
            if (!params?.role) {
              throw new Error('Role is required for role change');
            }
            result = await supabaseAdmin.rpc('change_user_role', {
              target_user_id: userId,
              admin_user_id: adminId,
              new_role: params.role
            });
            break;
            
          case 'delete':
            // Get user info for logging before deletion
            const { data: userToDelete } = await supabaseAdmin
              .from('profiles')
              .select('email, full_name')
              .eq('id', userId)
              .single();
              
            const { error: deleteError } = await supabaseAdmin
              .from('profiles')
              .delete()
              .eq('id', userId);
              
            if (deleteError) throw deleteError;
            
            // Log the deletion
            await supabaseAdmin.rpc('log_admin_action', {
              admin_id: adminId,
              target_user_id: userId,
              action_type: 'user_deleted',
              action_details: { 
                deleted_user: userToDelete?.email || 'Unknown',
                bulk_operation: true 
              }
            });
            
            result = { success: true };
            break;
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        
        results.push({ userId, success: true, result });
      } catch (error: any) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      summary: {
        total: userIds.length,
        successful: successCount,
        failed: failureCount
      },
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
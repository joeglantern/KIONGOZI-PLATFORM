import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const { chatId } = params;

    const { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        profiles!conversations_user_id_fkey (
          full_name,
          first_name,
          last_name,
          email,
          role,
          status
        ),
        messages (
          id,
          text,
          is_user,
          type,
          research_data,
          created_at
        )
      `)
      .eq('id', chatId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const { chatId } = params;
    const { adminId } = await request.json();

    // Get conversation info for logging before deletion
    const { data: conversationToDelete } = await supabaseAdmin
      .from('conversations')
      .select('title, user_id, profiles!conversations_user_id_fkey(email)')
      .eq('id', chatId)
      .single() as { data: { title: string | null; user_id: string; profiles: { email: string } | null } | null };

    // Delete conversation (cascades to messages)
    const { error } = await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('id', chatId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action
    if (adminId) {
      await supabaseAdmin.rpc('log_admin_action', {
        admin_id: adminId,
        target_user_id: conversationToDelete?.user_id,
        action_type: 'conversation_deleted',
        action_details: { 
          conversation_title: conversationToDelete?.title || 'Untitled',
          user_email: conversationToDelete?.profiles?.email || 'Unknown'
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const { chatId } = params;
    const { action, adminId } = await request.json(); // action: 'archive' | 'unarchive'

    if (!['archive', 'unarchive'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Add archived field if it doesn't exist (we'll add this to migration)
    const updateData = action === 'archive' 
      ? { archived_at: new Date().toISOString(), archived_by: adminId }
      : { archived_at: null, archived_by: null };

    const { data: updatedConversation, error } = await supabaseAdmin
      .from('conversations')
      .update(updateData)
      .eq('id', chatId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action
    if (adminId) {
      await supabaseAdmin.rpc('log_admin_action', {
        admin_id: adminId,
        target_user_id: updatedConversation.user_id,
        action_type: action === 'archive' ? 'conversation_archived' : 'conversation_unarchived',
        action_details: { 
          conversation_title: updatedConversation.title || 'Untitled'
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      conversation: updatedConversation 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
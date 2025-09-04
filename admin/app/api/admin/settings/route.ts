import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabaseAdmin
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('setting_key', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: settings, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group settings by category
    const groupedSettings: Record<string, any> = {};
    
    (settings || []).forEach((setting: any) => {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = {};
      }
      
      // Parse the JSON value based on data type
      let value = setting.setting_value;
      try {
        if (setting.data_type === 'string') {
          value = typeof value === 'string' ? value : JSON.parse(value);
        } else if (setting.data_type === 'number') {
          value = typeof value === 'number' ? value : parseFloat(JSON.parse(value));
        } else if (setting.data_type === 'boolean') {
          value = typeof value === 'boolean' ? value : JSON.parse(value);
        } else if (setting.data_type === 'json') {
          value = typeof value === 'object' ? value : JSON.parse(value);
        }
      } catch (e) {
        // If parsing fails, use raw value
        value = setting.setting_value;
      }

      groupedSettings[setting.category][setting.setting_key] = {
        value,
        description: setting.description,
        dataType: setting.data_type,
        isPublic: setting.is_public,
        updatedAt: setting.updated_at
      };
    });

    return NextResponse.json({ settings: groupedSettings });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, settings, admin_user_id } = body;

    if (!category || !settings || !admin_user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: category, settings, admin_user_id' },
        { status: 400 }
      );
    }

    const updates = [];
    const errors = [];

    // Update each setting
    for (const [settingKey, settingData] of Object.entries(settings)) {
      try {
        const { value } = settingData as any;
        
        // Convert value to JSON for storage
        let jsonValue;
        if (typeof value === 'string') {
          jsonValue = JSON.stringify(value);
        } else {
          jsonValue = JSON.stringify(value);
        }

        const { error } = await supabaseAdmin
          .from('system_settings')
          .update({
            setting_value: jsonValue,
            updated_at: new Date().toISOString()
          })
          .eq('category', category)
          .eq('setting_key', settingKey);

        if (error) {
          errors.push(`${settingKey}: ${error.message}`);
        } else {
          updates.push(settingKey);
        }
      } catch (err: any) {
        errors.push(`${settingKey}: ${err.message}`);
      }
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_user_id,
      action_type: 'update_settings',
      target_type: 'system_settings',
      details: { 
        category, 
        updated_settings: updates,
        errors: errors.length > 0 ? errors : null
      },
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent')
    });

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Updated ${updates.length} settings, but encountered ${errors.length} errors`,
        updated: updates,
        errors
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updates.length} settings`,
      updated: updates
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      category, 
      setting_key, 
      setting_value, 
      description, 
      data_type = 'string',
      is_public = false,
      admin_user_id 
    } = body;

    if (!category || !setting_key || setting_value === undefined || !admin_user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert value to JSON for storage
    let jsonValue = JSON.stringify(setting_value);

    const { data: setting, error } = await supabaseAdmin
      .from('system_settings')
      .insert({
        category,
        setting_key,
        setting_value: jsonValue,
        description,
        data_type,
        is_public,
        updated_by: admin_user_id
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_user_id,
      action_type: 'create_setting',
      target_type: 'system_settings',
      target_id: setting.id,
      details: { category, setting_key, data_type },
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent')
    });

    return NextResponse.json({ setting }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
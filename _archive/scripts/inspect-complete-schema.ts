import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAllTables(): Promise<string[]> {
    // Get list of all tables by trying to query information_schema
    const knownTables = [
        'profiles', 'courses', 'learning_modules', 'module_categories',
        'course_modules', 'course_enrollments', 'user_progress',
        'quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_answers',
        'badges', 'user_badges', 'achievements', 'user_achievements',
        'certificates', 'notifications', 'chat_rooms', 'chat_messages',
        'chat_participants', 'user_streaks', 'xp_transactions'
    ];

    const existingTables: string[] = [];

    for (const table of knownTables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error || error.code !== '42P01') { // 42P01 = undefined_table
            existingTables.push(table);
        }
    }

    return existingTables.sort();
}

async function getTableSchema(tableName: string) {
    // Get a sample row to infer schema
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
        return { columns: [], sampleData: null, rowCount: 0 };
    }

    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

    // Get row count
    const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });

    return {
        columns,
        sampleData: data && data.length > 0 ? data[0] : null,
        rowCount: count || 0
    };
}

function inferType(value: any): string {
    if (value === null || value === undefined) return 'unknown';
    if (typeof value === 'string') {
        if (value.match(/^\d{4}-\d{2}-\d{2}T/)) return 'timestamp';
        if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return 'uuid';
        return 'text';
    }
    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'integer' : 'numeric';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'jsonb';
    return 'unknown';
}

async function analyzeRelationships(tables: string[]): Promise<any[]> {
    const relationships: any[] = [];

    // Common FK patterns
    const fkPatterns = [
        { suffix: '_id', likely: true },
        { suffix: 'user_id', likely: true },
        { suffix: 'author_id', likely: true },
        { suffix: 'course_id', likely: true },
        { suffix: 'module_id', likely: true },
        { suffix: 'category_id', likely: true },
    ];

    for (const table of tables) {
        const schema = await getTableSchema(table);

        for (const column of schema.columns) {
            // Check if column name suggests a foreign key
            if (column.endsWith('_id')) {
                const referencedTable = column.replace(/_id$/, '') + 's';
                const altReferencedTable = column.replace(/_id$/, '');

                if (tables.includes(referencedTable)) {
                    relationships.push({
                        from_table: table,
                        from_column: column,
                        to_table: referencedTable,
                        to_column: 'id',
                        inferred: true
                    });
                } else if (tables.includes(altReferencedTable)) {
                    relationships.push({
                        from_table: table,
                        from_column: column,
                        to_table: altReferencedTable,
                        to_column: 'id',
                        inferred: true
                    });
                }
            }
        }
    }

    return relationships;
}

async function generateDocumentation() {
    console.log('🔍 Analyzing database schema...\n');

    const tables = await getAllTables();
    console.log(`✅ Found ${tables.length} tables\n`);

    let markdown = '# Kiongozi LMS - Complete Database Schema\n\n';
    markdown += `*Generated on ${new Date().toLocaleString()}*\n\n`;
    markdown += '---\n\n';

    // Table of Contents
    markdown += '## Table of Contents\n\n';
    markdown += '1. [Database Overview](#database-overview)\n';
    markdown += '2. [Entity Relationship Diagram](#entity-relationship-diagram)\n';
    markdown += '3. [Tables](#tables)\n';
    markdown += '4. [Inferred Relationships](#inferred-relationships)\n\n';
    markdown += '---\n\n';

    // Overview
    markdown += '## Database Overview\n\n';
    let totalRows = 0;
    for (const table of tables) {
        const schema = await getTableSchema(table);
        totalRows += schema.rowCount;
    }
    markdown += `**Total Tables:** ${tables.length}\n\n`;
    markdown += `**Total Rows:** ${totalRows.toLocaleString()}\n\n`;
    markdown += `**Database URL:** ${supabaseUrl}\n\n`;

    // ER Diagram
    console.log('📊 Generating ER diagram...\n');
    const relationships = await analyzeRelationships(tables);

    markdown += '## Entity Relationship Diagram\n\n';
    markdown += '```mermaid\nerDiagram\n';

    for (const table of tables) {
        const schema = await getTableSchema(table);
        markdown += `    ${table} {\n`;

        for (const column of schema.columns.slice(0, 8)) {
            const type = schema.sampleData ? inferType(schema.sampleData[column]) : 'unknown';
            markdown += `        ${type} ${column}\n`;
        }

        if (schema.columns.length > 8) {
            markdown += `        string "... ${schema.columns.length - 8} more"\n`;
        }

        markdown += `    }\n`;
    }

    // Add relationships to diagram
    for (const rel of relationships) {
        markdown += `    ${rel.from_table} }o--|| ${rel.to_table} : "${rel.from_column}"\n`;
    }

    markdown += '```\n\n';

    // Tables Section
    markdown += '## Tables\n\n';

    for (const table of tables) {
        console.log(`  📋 Analyzing ${table}...`);
        const schema = await getTableSchema(table);

        markdown += `### ${table}\n\n`;
        markdown += `**Row Count:** ${schema.rowCount.toLocaleString()}\n\n`;
        markdown += `**Columns:** ${schema.columns.length}\n\n`;

        if (schema.columns.length > 0) {
            markdown += '| Column | Inferred Type | Sample Value |\n';
            markdown += '|--------|---------------|---------------|\n';

            for (const column of schema.columns) {
                const type = schema.sampleData ? inferType(schema.sampleData[column]) : 'unknown';
                let sampleValue = schema.sampleData ? schema.sampleData[column] : '-';

                // Truncate long values
                if (typeof sampleValue === 'string' && sampleValue.length > 50) {
                    sampleValue = sampleValue.substring(0, 47) + '...';
                } else if (typeof sampleValue === 'object') {
                    sampleValue = JSON.stringify(sampleValue).substring(0, 47) + '...';
                }

                markdown += `| \`${column}\` | ${type} | ${sampleValue} |\n`;
            }

            markdown += '\n';
        }

        // Get a few sample rows
        if (schema.rowCount > 0 && schema.rowCount <= 5) {
            const { data: samples } = await supabase.from(table).select('*').limit(3);
            if (samples && samples.length > 0) {
                markdown += '**Sample Data:**\n\n';
                markdown += '```json\n';
                markdown += JSON.stringify(samples, null, 2);
                markdown += '\n```\n\n';
            }
        }
    }

    // Relationships
    markdown += '## Inferred Relationships\n\n';
    markdown += '> **Note:** These relationships are inferred from column naming conventions. Actual foreign key constraints may differ.\n\n';

    if (relationships.length > 0) {
        markdown += '| From Table | From Column | To Table | To Column |\n';
        markdown += '|------------|-------------|----------|------------|\n';

        for (const rel of relationships) {
            markdown += `| ${rel.from_table} | ${rel.from_column} | ${rel.to_table} | ${rel.to_column} |\n`;
        }
    } else {
        markdown += '*No relationships inferred.*\n';
    }

    markdown += '\n';

    // Additional Notes
    markdown += '## Additional Notes\n\n';
    markdown += '### RLS Policies\n\n';
    markdown += 'Row Level Security (RLS) policies are enabled on this database. To view specific policies, please check the Supabase Dashboard under Authentication > Policies.\n\n';

    markdown += '### Functions & Triggers\n\n';
    markdown += 'Custom PostgreSQL functions and triggers may be present. Check the Supabase Dashboard under Database > Functions for details.\n\n';

    return markdown;
}

async function run() {
    try {
        const documentation = await generateDocumentation();

        const outputPath = path.resolve(process.cwd(), 'DATABASE_SCHEMA.md');
        fs.writeFileSync(outputPath, documentation, 'utf8');

        console.log(`\n✅ Documentation generated successfully!`);
        console.log(`📄 Saved to: DATABASE_SCHEMA.md\n`);

    } catch (err: any) {
        console.error(`\n❌ Error: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    }
}

run();

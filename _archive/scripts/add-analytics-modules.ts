
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const analyticsModules = [
    {
        title: 'Introduction to Data Analytics',
        description: 'Learn the fundamentals of data analytics, its importance in modern business, and the data analytics lifecycle.',
        content: `# Introduction to Data Analytics

## What is Data Analytics?

Data analytics is the process of examining datasets to draw conclusions about the information they contain. It involves applying algorithmic or mechanical processes to derive insights from data.

## Why Data Analytics Matters

In today's data-driven world, organizations use data analytics to:
- Make informed business decisions
- Identify trends and patterns
- Predict future outcomes
- Optimize operations
- Understand customer behavior

## The Data Analytics Lifecycle

1. **Data Collection**: Gathering raw data from various sources
2. **Data Cleaning**: Removing errors and inconsistencies
3. **Data Analysis**: Applying statistical methods and algorithms
4. **Data Visualization**: Creating charts and graphs to communicate findings
5. **Insight Generation**: Drawing actionable conclusions

## Types of Data Analytics

- **Descriptive Analytics**: What happened?
- **Diagnostic Analytics**: Why did it happen?
- **Predictive Analytics**: What will happen?
- **Prescriptive Analytics**: What should we do?

## Key Takeaways

- Data analytics transforms raw data into valuable insights
- It's essential for evidence-based decision making
- Python is one of the most popular tools for data analytics
- The field combines statistics, programming, and domain knowledge

In the next module, we'll set up your Python environment for data analytics!`,
        estimated_duration_minutes: 45,
        difficulty_level: 'beginner'
    },
    {
        title: 'Python Environment Setup for Data Analytics',
        description: 'Set up your Python development environment with essential libraries like NumPy, Pandas, and Matplotlib.',
        content: `# Python Environment Setup for Data Analytics

## Installing Python

If you haven't installed Python yet, download it from python.org. We recommend Python 3.8 or higher.

## Essential Libraries for Data Analytics

We'll be using these core libraries:

1. **NumPy**: Numerical computing
2. **Pandas**: Data manipulation and analysis
3. **Matplotlib**: Data visualization
4. **Seaborn**: Statistical data visualization
5. **Jupyter Notebook**: Interactive development environment

## Installation Commands

\`\`\`bash
# Install pip (if not already installed)
python -m ensurepip --upgrade

# Install essential libraries
pip install numpy pandas matplotlib seaborn jupyter

# Verify installations
python -c "import numpy; print('NumPy:', numpy.__version__)"
python -c "import pandas; print('Pandas:', pandas.__version__)"
\`\`\`

## Setting Up Jupyter Notebook

Jupyter Notebook provides an interactive environment perfect for data analytics.

## Your First Data Analytics Script

\`\`\`python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Create sample data
data = {'Name': ['Alice', 'Bob', 'Charlie'],
        'Score': [85, 92, 78]}
df = pd.DataFrame(data)

print(df)
\`\`\`

Ready to dive into NumPy!`,
        estimated_duration_minutes: 30,
        difficulty_level: 'beginner'
    },
    {
        title: 'NumPy Fundamentals for Data Analytics',
        description: 'Master NumPy arrays, mathematical operations, and array manipulation techniques essential for data analytics.',
        content: `# NumPy Fundamentals

NumPy (Numerical Python) is the foundation of data analytics in Python.

## Creating Arrays

\`\`\`python
import numpy as np

# From a list
arr = np.array([1, 2, 3, 4, 5])

# Generate arrays
zeros = np.zeros((3, 3))
ones = np.ones((2, 4))
range_arr = np.arange(0, 10, 2)
\`\`\`

## Array Operations

\`\`\`python
arr = np.array([1, 2, 3, 4, 5])
print(arr + 10)      # Add 10
print(arr * 2)       # Multiply by 2
print(arr ** 2)      # Square

# Statistics
print(np.mean(arr))
print(np.std(arr))
print(np.max(arr))
\`\`\`

Practice with real datasets!`,
        estimated_duration_minutes: 60,
        difficulty_level: 'beginner'
    },
    {
        title: 'Pandas for Data Manipulation',
        description: 'Learn to use Pandas DataFrames for data cleaning, transformation, and analysis.',
        content: `# Pandas for Data Manipulation

Pandas provides powerful data structures for data analysis.

## Creating DataFrames

\`\`\`python
import pandas as pd

data = {
    'Name': ['Alice', 'Bob', 'Charlie'],
    'Age': [25, 30, 35],
    'Salary': [50000, 60000, 75000]
}
df = pd.DataFrame(data)
\`\`\`

## Data Operations

\`\`\`python
# Reading data
df = pd.read_csv('data.csv')

# Exploring
print(df.head())
print(df.describe())

# Filtering
young = df[df['Age'] < 30]

# Grouping
df.groupby('Department')['Salary'].mean()
\`\`\`

Master data manipulation!`,
        estimated_duration_minutes: 90,
        difficulty_level: 'intermediate'
    },
    {
        title: 'Data Visualization with Matplotlib',
        description: 'Create compelling visualizations using Matplotlib to communicate data insights effectively.',
        content: `# Data Visualization with Matplotlib

Visualization makes data understandable.

## Basic Plots

\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Line plot
x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.title('Sine Wave')
plt.show()

# Bar chart
plt.bar(['A', 'B', 'C'], [23, 45, 56])
plt.show()

# Scatter plot
plt.scatter(x, y)
plt.show()
\`\`\`

## Customization

\`\`\`python
plt.figure(figsize=(10, 6))
plt.plot(x, y, color='red', linewidth=2)
plt.grid(True)
plt.show()
\`\`\`

Create stunning visualizations!`,
        estimated_duration_minutes: 75,
        difficulty_level: 'intermediate'
    },
    {
        title: 'Statistical Analysis with Seaborn',
        description: 'Use Seaborn for advanced statistical visualizations and exploratory data analysis.',
        content: `# Statistical Analysis with Seaborn

Seaborn makes statistical visualization easy.

## Getting Started

\`\`\`python
import seaborn as sns
import matplotlib.pyplot as plt

# Set style
sns.set_style('whitegrid')

# Load sample data
tips = sns.load_dataset('tips')
\`\`\`

## Visualizations

\`\`\`python
# Distribution
sns.histplot(data=tips, x='total_bill', kde=True)

# Relationships
sns.regplot(data=tips, x='total_bill', y='tip')

# Categories
sns.boxplot(data=tips, x='day', y='total_bill')

# Correlation
corr = tips.corr()
sns.heatmap(corr, annot=True)
\`\`\`

Analyze like a pro!`,
        estimated_duration_minutes: 75,
        difficulty_level: 'intermediate'
    },
    {
        title: 'Data Analytics Project: Sales Analysis',
        description: 'Apply all your skills in a comprehensive real-world project analyzing sales data.',
        content: `# Data Analytics Project: Sales Analysis

## Project Overview

Analyze a year of sales data to extract actionable insights.

## Tasks

1. Load and clean sales data
2. Answer business questions:
   - What was the best month for sales?
   - Which city had highest sales?
   - What time for advertisements?
   - Products sold together?
   - Best-selling product and why?

## Sample Analysis

\`\`\`python
import pandas as pd

# Load data
df = pd.read_csv('sales_data.csv')

# Clean data
df = df.dropna()
df['Sales'] = df['Quantity'] * df['Price']

# Analyze
monthly_sales = df.groupby('Month')['Sales'].sum()
best_month = monthly_sales.idxmax()
\`\`\`

## Deliverables

- Complete Jupyter notebook
- 5+ visualizations
- Business recommendations

Congratulations on completing the course!`,
        estimated_duration_minutes: 120,
        difficulty_level: 'advanced'
    }
];

async function run() {
    console.log('🚀 Starting Data Analytics modules insertion...');

    try {
        // 1. Get or Create Category
        console.log('📚 Checking "Data Science" category...');

        // Manual check for category
        let categoryId;
        const { data: existingCategory } = await supabase
            .from('module_categories')
            .select('id')
            .eq('name', 'Data Science')
            .single();

        if (existingCategory) {
            categoryId = existingCategory.id;
            console.log(`✅ Found existing Category ID: ${categoryId}`);
        } else {
            const { data: newCategory, error: catError } = await supabase
                .from('module_categories')
                .insert({
                    name: 'Data Science',
                    description: 'Data science and analytics courses',
                    color: '#8B5CF6',
                    icon: '📊'
                })
                .select()
                .single();

            if (catError) throw new Error(`Category creation error: ${catError.message}`);
            categoryId = newCategory.id;
            console.log(`✅ Created Category ID: ${categoryId}`);
        }

        // 2. Get Admin User (Author)
        const { data: adminUser } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .single();

        if (!adminUser) throw new Error('No admin user found to set as author');
        const authorId = adminUser.id;

        // 3. Get or Create Course
        console.log('🎓 Checking "Data Analytics with Python" course...');

        let courseId;
        const { data: existingCourse } = await supabase
            .from('courses')
            .select('id')
            .eq('title', 'Data Analytics with Python')
            .single();

        if (existingCourse) {
            courseId = existingCourse.id;
            console.log(`✅ Found existing Course ID: ${courseId}`);
        } else {
            const { data: newCourse, error: courseError } = await supabase
                .from('courses')
                .insert({
                    title: 'Data Analytics with Python',
                    description: 'Master data analysis with Python. Learn to use NumPy, Pandas, Matplotlib, and Seaborn to process, analyze, and visualize data.',
                    category_id: categoryId,
                    difficulty_level: 'beginner',
                    estimated_duration_hours: 15,
                    author_id: authorId,
                    status: 'published',
                    published_at: new Date().toISOString()
                })
                .select()
                .single();

            if (courseError) throw new Error(`Course creation error: ${courseError.message}`);
            courseId = newCourse.id;
            console.log(`✅ Created Course ID: ${courseId}`);
        }

        // 4. Insert Modules
        console.log('📦 Inserting modules...');
        for (const [index, mod] of analyticsModules.entries()) {
            // Check if module exists
            let moduleId;
            const { data: existingModule } = await supabase
                .from('learning_modules')
                .select('id')
                .eq('title', mod.title)
                .single();

            if (existingModule) {
                moduleId = existingModule.id;
                // Optional: Update content if needed, but skipping for now to be safe
                console.log(`  ✓ Found module: ${mod.title}`);
            } else {
                const { data: newModule, error: moduleError } = await supabase
                    .from('learning_modules')
                    .insert({
                        title: mod.title,
                        description: mod.description,
                        content: mod.content,
                        category_id: categoryId,
                        difficulty_level: mod.difficulty_level,
                        estimated_duration_minutes: mod.estimated_duration_minutes,
                        author_id: authorId,
                        status: 'published',
                        published_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (moduleError) {
                    console.error(`❌ Error inserting module "${mod.title}": ${moduleError.message}`);
                    continue;
                }
                moduleId = newModule.id;
                console.log(`  ✓ Created module: ${mod.title}`);
            }

            // Link to course
            // Check if link exists
            const { data: existingLink } = await supabase
                .from('course_modules')
                .select('id')
                .eq('course_id', courseId)
                .eq('module_id', moduleId)
                .single();

            if (!existingLink) {
                const { error: linkError } = await supabase
                    .from('course_modules')
                    .insert({
                        course_id: courseId,
                        module_id: moduleId,
                        order_index: index + 1,
                        is_required: true
                    });

                if (linkError) {
                    console.error(`❌ Error linking module "${mod.title}": ${linkError.message}`);
                } else {
                    console.log(`  ✓ Linked module: ${mod.title}`);
                }
            } else {
                console.log(`  ✓ Already linked: ${mod.title}`);
            }
        }

        console.log('\n✨ Database update complete!');

    } catch (err: any) {
        console.error(`\n❌ Script failed: ${err.message}`);
        process.exit(1);
    }
}

run();

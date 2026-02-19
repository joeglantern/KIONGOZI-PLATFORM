const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createDataAnalyticsModules() {
  const courseId = '2ac6c8b7-60a2-4ccc-b763-f135d001c097'; // Data Analytics with Python

  // Define the modules for Data Analytics with Python
  const modules = [
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
      difficulty_level: 'beginner',
      order_index: 1
    },
    {
      title: 'Python Environment Setup for Data Analytics',
      description: 'Set up your Python development environment with essential libraries like NumPy, Pandas, and Matplotlib.',
      content: `# Python Environment Setup for Data Analytics

## Installing Python

If you haven't installed Python yet, download it from [python.org](https://python.org). We recommend Python 3.8 or higher.

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

Jupyter Notebook provides an interactive environment perfect for data analytics:

\`\`\`bash
# Start Jupyter Notebook
jupyter notebook
\`\`\`

This will open a web interface where you can create and run Python code interactively.

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

## Next Steps

Now that your environment is ready, we'll dive into NumPy for numerical computing!`,
      estimated_duration_minutes: 30,
      difficulty_level: 'beginner',
      order_index: 2
    },
    {
      title: 'NumPy Fundamentals',
      description: 'Master NumPy arrays, mathematical operations, and array manipulation techniques essential for data analytics.',
      content: `# NumPy Fundamentals

## What is NumPy?

NumPy (Numerical Python) is the foundation of data analytics in Python. It provides powerful array objects and mathematical functions.

## Creating NumPy Arrays

\`\`\`python
import numpy as np

# From a list
arr1 = np.array([1, 2, 3, 4, 5])

# Multi-dimensional array
arr2 = np.array([[1, 2, 3], [4, 5, 6]])

# Generate arrays
zeros = np.zeros((3, 3))  # 3x3 array of zeros
ones = np.ones((2, 4))    # 2x4 array of ones
range_arr = np.arange(0, 10, 2)  # [0, 2, 4, 6, 8]
\`\`\`

## Array Operations

\`\`\`python
# Mathematical operations
arr = np.array([1, 2, 3, 4, 5])
print(arr + 10)      # Add 10 to each element
print(arr * 2)       # Multiply each element by 2
print(arr ** 2)      # Square each element

# Statistical functions
print(np.mean(arr))  # Average
print(np.std(arr))   # Standard deviation
print(np.max(arr))   # Maximum value
\`\`\`

## Array Indexing and Slicing

\`\`\`python
arr = np.array([10, 20, 30, 40, 50])

# Indexing
print(arr[0])     # First element: 10
print(arr[-1])    # Last element: 50

# Slicing
print(arr[1:4])   # [20, 30, 40]
print(arr[::2])   # [10, 30, 50] - every other element
\`\`\`

## Reshaping Arrays

\`\`\`python
arr = np.arange(12)
reshaped = arr.reshape(3, 4)  # Convert to 3x4 matrix
print(reshaped)
\`\`\`

## Practice Exercise

Create a NumPy array of 100 random numbers, calculate the mean and standard deviation, and find all numbers greater than the mean.

\`\`\`python
data = np.random.randn(100)
mean = np.mean(data)
std = np.std(data)
above_mean = data[data > mean]

print(f"Mean: {mean:.2f}")
print(f"Std Dev: {std:.2f}")
print(f"Count above mean: {len(above_mean)}")
\`\`\`

## Next Module

In the next module, we'll learn Pandas for powerful data manipulation!`,
      estimated_duration_minutes: 60,
      difficulty_level: 'beginner',
      order_index: 3
    },
    {
      title: 'Pandas for Data Manipulation',
      description: 'Learn to use Pandas DataFrames for data cleaning, transformation, and analysis.',
      content: `# Pandas for Data Manipulation

## Introduction to Pandas

Pandas is the most popular library for data manipulation in Python. It provides two main data structures:
- **Series**: One-dimensional labeled array
- **DataFrame**: Two-dimensional labeled data structure (like a spreadsheet)

## Creating DataFrames

\`\`\`python
import pandas as pd

# From a dictionary
data = {
    'Name': ['Alice', 'Bob', 'Charlie', 'David'],
    'Age': [25, 30, 35, 28],
    'Salary': [50000, 60000, 75000, 55000]
}
df = pd.DataFrame(data)
print(df)
\`\`\`

## Reading Data from Files

\`\`\`python
# Read CSV file
df = pd.read_csv('data.csv')

# Read Excel file
df = pd.read_excel('data.xlsx')

# Read JSON file
df = pd.read_json('data.json')
\`\`\`

## Exploring Data

\`\`\`python
# First few rows
print(df.head())

# Last few rows
print(df.tail())

# Summary statistics
print(df.describe())

# Data types
print(df.dtypes)

# Column names
print(df.columns)
\`\`\`

## Selecting Data

\`\`\`python
# Select a column
names = df['Name']

# Select multiple columns
subset = df[['Name', 'Age']]

# Filter rows
young_people = df[df['Age'] < 30]

# Multiple conditions
filtered = df[(df['Age'] > 25) & (df['Salary'] > 55000)]
\`\`\`

## Data Cleaning

\`\`\`python
# Handle missing values
df.dropna()  # Remove rows with missing values
df.fillna(0)  # Fill missing values with 0

# Remove duplicates
df.drop_duplicates()

# Rename columns
df.rename(columns={'old_name': 'new_name'})
\`\`\`

## Data Transformation

\`\`\`python
# Add new column
df['Bonus'] = df['Salary'] * 0.1

# Group by and aggregate
df.groupby('Department')['Salary'].mean()

# Sort values
df.sort_values('Salary', ascending=False)
\`\`\`

## Practice Exercise

Load a CSV file, clean the data, and calculate summary statistics:

\`\`\`python
# Load data
df = pd.read_csv('sales_data.csv')

# Remove missing values
df_clean = df.dropna()

# Calculate total sales by region
sales_by_region = df_clean.groupby('Region')['Sales'].sum()

# Find top 5 products
top_products = df_clean.groupby('Product')['Sales'].sum().sort_values(ascending=False).head(5)
\`\`\`

## Next Module

Next, we'll learn data visualization with Matplotlib and Seaborn!`,
      estimated_duration_minutes: 90,
      difficulty_level: 'intermediate',
      order_index: 4
    },
    {
      title: 'Data Visualization with Matplotlib',
      description: 'Create compelling visualizations using Matplotlib to communicate data insights effectively.',
      content: `# Data Visualization with Matplotlib

## Why Data Visualization?

"A picture is worth a thousand words" - especially in data analytics! Visualization helps us:
- Identify patterns and trends
- Communicate findings effectively
- Make data accessible to non-technical audiences

## Getting Started with Matplotlib

\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Simple line plot
x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.plot(x, y)
plt.title('Sine Wave')
plt.xlabel('X axis')
plt.ylabel('Y axis')
plt.show()
\`\`\`

## Common Plot Types

### Bar Charts

\`\`\`python
categories = ['A', 'B', 'C', 'D']
values = [23, 45, 56, 78]

plt.bar(categories, values)
plt.title('Bar Chart Example')
plt.xlabel('Categories')
plt.ylabel('Values')
plt.show()
\`\`\`

### Scatter Plots

\`\`\`python
x = np.random.rand(50)
y = np.random.rand(50)

plt.scatter(x, y, alpha=0.5)
plt.title('Scatter Plot')
plt.xlabel('X values')
plt.ylabel('Y values')
plt.show()
\`\`\`

### Histograms

\`\`\`python
data = np.random.randn(1000)

plt.hist(data, bins=30, edgecolor='black')
plt.title('Histogram')
plt.xlabel('Value')
plt.ylabel('Frequency')
plt.show()
\`\`\`

## Customizing Plots

\`\`\`python
plt.figure(figsize=(10, 6))
plt.plot(x, y, color='red', linewidth=2, linestyle='--', marker='o')
plt.title('Customized Plot', fontsize=16)
plt.xlabel('X axis', fontsize=12)
plt.ylabel('Y axis', fontsize=12)
plt.grid(True, alpha=0.3)
plt.legend(['Sine Wave'])
plt.show()
\`\`\`

## Subplots

\`\`\`python
fig, axes = plt.subplots(2, 2, figsize=(12, 8))

# Plot 1
axes[0, 0].plot([1, 2, 3], [1, 4, 9])
axes[0, 0].set_title('Plot 1')

# Plot 2
axes[0, 1].bar(['A', 'B', 'C'], [10, 20, 15])
axes[0, 1].set_title('Plot 2')

# Plot 3
axes[1, 0].scatter(np.random.rand(20), np.random.rand(20))
axes[1, 0].set_title('Plot 3')

# Plot 4
axes[1, 1].hist(np.random.randn(1000), bins=20)
axes[1, 1].set_title('Plot 4')

plt.tight_layout()
plt.show()
\`\`\`

## Saving Plots

\`\`\`python
plt.plot(x, y)
plt.savefig('my_plot.png', dpi=300, bbox_inches='tight')
\`\`\`

## Practice Exercise

Create a dashboard with 4 different visualizations showing sales data analysis.

## Next Module

We'll explore Seaborn for statistical visualizations!`,
      estimated_duration_minutes: 75,
      difficulty_level: 'intermediate',
      order_index: 5
    },
    {
      title: 'Statistical Analysis with Seaborn',
      description: 'Use Seaborn for advanced statistical visualizations and exploratory data analysis.',
      content: `# Statistical Analysis with Seaborn

## Introduction to Seaborn

Seaborn is built on top of Matplotlib and provides beautiful, informative statistical graphics with less code.

\`\`\`python
import seaborn as sns
import pandas as pd
import matplotlib.pyplot as plt

# Set style
sns.set_style('whitegrid')
\`\`\`

## Distribution Plots

\`\`\`python
# Load sample dataset
tips = sns.load_dataset('tips')

# Histogram with KDE
sns.histplot(data=tips, x='total_bill', kde=True)
plt.show()

# Violin plot
sns.violinplot(data=tips, x='day', y='total_bill')
plt.show()
\`\`\`

## Relationship Plots

\`\`\`python
# Scatter plot with regression line
sns.regplot(data=tips, x='total_bill', y='tip')
plt.show()

# Joint plot
sns.jointplot(data=tips, x='total_bill', y='tip', kind='reg')
plt.show()
\`\`\`

## Categorical Plots

\`\`\`python
# Box plot
sns.boxplot(data=tips, x='day', y='total_bill')
plt.show()

# Count plot
sns.countplot(data=tips, x='day')
plt.show()
\`\`\`

## Heatmaps

\`\`\`python
# Correlation matrix
corr = tips.corr()
sns.heatmap(corr, annot=True, cmap='coolwarm')
plt.show()
\`\`\`

## Pair Plots

\`\`\`python
# Visualize relationships between all numeric columns
sns.pairplot(tips, hue='sex')
plt.show()
\`\`\`

## Practice Exercise

Analyze the Titanic dataset using Seaborn visualizations.

## Next Module

Final project: Real-world data analytics case study!`,
      estimated_duration_minutes: 75,
      difficulty_level: 'intermediate',
      order_index: 6
    },
    {
      title: 'Data Analytics Project: Sales Analysis',
      description: 'Apply all your skills in a comprehensive real-world project analyzing sales data.',
      content: `# Data Analytics Project: Sales Analysis

## Project Overview

In this capstone project, you'll analyze a year's worth of sales data to extract actionable insights.

## Dataset

You'll work with sales data containing:
- Order ID
- Product
- Quantity Ordered
- Price Each
- Order Date
- Purchase Address

## Project Tasks

### 1. Data Loading and Cleaning

\`\`\`python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Load data
df = pd.read_csv('sales_data.csv')

# Handle missing values
df = df.dropna()

# Convert data types
df['Order Date'] = pd.to_datetime(df['Order Date'])
df['Quantity Ordered'] = pd.to_numeric(df['Quantity Ordered'])
df['Price Each'] = pd.to_numeric(df['Price Each'])

# Create calculated columns
df['Sales'] = df['Quantity Ordered'] * df['Price Each']
df['Month'] = df['Order Date'].dt.month
\`\`\`

### 2. Analysis Questions

Answer these business questions:

1. **What was the best month for sales?**
2. **Which city had the highest sales?**
3. **What time should we display advertisements to maximize sales?**
4. **What products are most often sold together?**
5. **What product sold the most and why?**

### 3. Sample Solutions

**Best Month for Sales:**

\`\`\`python
monthly_sales = df.groupby('Month')['Sales'].sum()
best_month = monthly_sales.idxmax()

plt.figure(figsize=(10, 6))
monthly_sales.plot(kind='bar')
plt.title('Sales by Month')
plt.xlabel('Month')
plt.ylabel('Sales ($)')
plt.show()
\`\`\`

**Sales by City:**

\`\`\`python
df['City'] = df['Purchase Address'].apply(lambda x: x.split(',')[1])
city_sales = df.groupby('City')['Sales'].sum().sort_values(ascending=False)

plt.figure(figsize=(12, 6))
city_sales.plot(kind='barh')
plt.title('Sales by City')
plt.xlabel('Sales ($)')
plt.show()
\`\`\`

**Best Time for Ads:**

\`\`\`python
df['Hour'] = df['Order Date'].dt.hour
hourly_orders = df.groupby('Hour').size()

plt.figure(figsize=(12, 6))
hourly_orders.plot()
plt.title('Orders by Hour of Day')
plt.xlabel('Hour')
plt.ylabel('Number of Orders')
plt.xticks(range(0, 24))
plt.grid(True)
plt.show()
\`\`\`

### 4. Final Report

Create a presentation including:
- Executive summary
- Key findings with visualizations
- Recommendations
- Next steps

## Deliverables

1. Jupyter notebook with complete analysis
2. At least 5 different visualizations
3. Written insights for each analysis
4. Business recommendations

## Congratulations!

You've completed the Data Analytics with Python course! You now have the skills to:
- Clean and prepare data
- Perform exploratory data analysis
- Create compelling visualizations
- Extract actionable insights
- Communicate findings effectively

Keep practicing with real datasets from Kaggle, government open data portals, and your own projects!`,
      estimated_duration_minutes: 120,
      difficulty_level: 'advanced',
      order_index: 7
    }
  ];

  console.log('🚀 Creating Data Analytics modules...\n');

  // Insert modules and link them to the course
  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];

    console.log(`${i + 1}. Creating: ${module.title}`);

    // Insert the learning module
    const { data: learningModule, error: moduleError } = await supabase
      .from('learning_modules')
      .insert({
        title: module.title,
        description: module.description,
        content: module.content,
        estimated_duration_minutes: module.estimated_duration_minutes,
        difficulty_level: module.difficulty_level
      })
      .select()
      .single();

    if (moduleError) {
      console.error(`   ❌ Error creating module: ${moduleError.message}`);
      continue;
    }

    console.log(`   ✅ Learning module created (ID: ${learningModule.id})`);

    // Link the module to the course
    const { error: linkError } = await supabase
      .from('course_modules')
      .insert({
        course_id: courseId,
        module_id: learningModule.id,
        order_index: module.order_index
      });

    if (linkError) {
      console.error(`   ❌ Error linking module: ${linkError.message}`);
    } else {
      console.log(`   ✅ Linked to course (order: ${module.order_index})`);
    }

    console.log('');
  }

  console.log('🎉 All modules created and linked!');
  console.log('\n📊 Summary:');
  console.log(`   Course: Data Analytics with Python`);
  console.log(`   Modules added: ${modules.length}`);
  console.log(`   Total duration: ${modules.reduce((sum, m) => sum + m.estimated_duration_minutes, 0)} minutes`);
}

createDataAnalyticsModules();

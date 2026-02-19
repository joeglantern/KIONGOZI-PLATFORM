-- Add Data Analytics with Python modules
-- Run this in your Supabase SQL Editor

-- First, let's insert the learning modules
INSERT INTO learning_modules (title, description, content, estimated_duration_minutes, difficulty_level)
VALUES
-- Module 1
('Introduction to Data Analytics',
 'Learn the fundamentals of data analytics, its importance in modern business, and the data analytics lifecycle.',
 '# Introduction to Data Analytics

## What is Data Analytics?

Data analytics is the process of examining datasets to draw conclusions about the information they contain. It involves applying algorithmic or mechanical processes to derive insights from data.

## Why Data Analytics Matters

In today''s data-driven world, organizations use data analytics to:
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
- It''s essential for evidence-based decision making
- Python is one of the most popular tools for data analytics
- The field combines statistics, programming, and domain knowledge

In the next module, we''ll set up your Python environment for data analytics!',
 45,
 'beginner'),

-- Module 2
('Python Environment Setup for Data Analytics',
 'Set up your Python development environment with essential libraries like NumPy, Pandas, and Matplotlib.',
 '# Python Environment Setup for Data Analytics

## Installing Python

If you haven''t installed Python yet, download it from python.org. We recommend Python 3.8 or higher.

## Essential Libraries for Data Analytics

We''ll be using these core libraries:

1. **NumPy**: Numerical computing
2. **Pandas**: Data manipulation and analysis
3. **Matplotlib**: Data visualization
4. **Seaborn**: Statistical data visualization
5. **Jupyter Notebook**: Interactive development environment

## Installation Commands

```bash
# Install pip (if not already installed)
python -m ensurepip --upgrade

# Install essential libraries
pip install numpy pandas matplotlib seaborn jupyter

# Verify installations
python -c "import numpy; print(''NumPy:'', numpy.__version__)"
python -c "import pandas; print(''Pandas:'', pandas.__version__)"
```

## Setting Up Jupyter Notebook

Jupyter Notebook provides an interactive environment perfect for data analytics.

## Your First Data Analytics Script

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Create sample data
data = {''Name'': [''Alice'', ''Bob'', ''Charlie''],
        ''Score'': [85, 92, 78]}
df = pd.DataFrame(data)

print(df)
```

Ready to dive into NumPy!',
 30,
 'beginner'),

-- Module 3
('NumPy Fundamentals for Data Analytics',
 'Master NumPy arrays, mathematical operations, and array manipulation techniques essential for data analytics.',
 '# NumPy Fundamentals

NumPy (Numerical Python) is the foundation of data analytics in Python.

## Creating Arrays

```python
import numpy as np

# From a list
arr = np.array([1, 2, 3, 4, 5])

# Generate arrays
zeros = np.zeros((3, 3))
ones = np.ones((2, 4))
range_arr = np.arange(0, 10, 2)
```

## Array Operations

```python
arr = np.array([1, 2, 3, 4, 5])
print(arr + 10)      # Add 10
print(arr * 2)       # Multiply by 2
print(arr ** 2)      # Square

# Statistics
print(np.mean(arr))
print(np.std(arr))
print(np.max(arr))
```

Practice with real datasets!',
 60,
 'beginner'),

-- Module 4
('Pandas for Data Manipulation',
 'Learn to use Pandas DataFrames for data cleaning, transformation, and analysis.',
 '# Pandas for Data Manipulation

Pandas provides powerful data structures for data analysis.

## Creating DataFrames

```python
import pandas as pd

data = {
    ''Name'': [''Alice'', ''Bob'', ''Charlie''],
    ''Age'': [25, 30, 35],
    ''Salary'': [50000, 60000, 75000]
}
df = pd.DataFrame(data)
```

## Data Operations

```python
# Reading data
df = pd.read_csv(''data.csv'')

# Exploring
print(df.head())
print(df.describe())

# Filtering
young = df[df[''Age''] < 30]

# Grouping
df.groupby(''Department'')[''Salary''].mean()
```

Master data manipulation!',
 90,
 'intermediate'),

-- Module 5
('Data Visualization with Matplotlib',
 'Create compelling visualizations using Matplotlib to communicate data insights effectively.',
 '# Data Visualization with Matplotlib

Visualization makes data understandable.

## Basic Plots

```python
import matplotlib.pyplot as plt
import numpy as np

# Line plot
x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.title(''Sine Wave'')
plt.show()

# Bar chart
plt.bar([''A'', ''B'', ''C''], [23, 45, 56])
plt.show()

# Scatter plot
plt.scatter(x, y)
plt.show()
```

## Customization

```python
plt.figure(figsize=(10, 6))
plt.plot(x, y, color=''red'', linewidth=2)
plt.grid(True)
plt.show()
```

Create stunning visualizations!',
 75,
 'intermediate'),

-- Module 6
('Statistical Analysis with Seaborn',
 'Use Seaborn for advanced statistical visualizations and exploratory data analysis.',
 '# Statistical Analysis with Seaborn

Seaborn makes statistical visualization easy.

## Getting Started

```python
import seaborn as sns
import matplotlib.pyplot as plt

# Set style
sns.set_style(''whitegrid'')

# Load sample data
tips = sns.load_dataset(''tips'')
```

## Visualizations

```python
# Distribution
sns.histplot(data=tips, x=''total_bill'', kde=True)

# Relationships
sns.regplot(data=tips, x=''total_bill'', y=''tip'')

# Categories
sns.boxplot(data=tips, x=''day'', y=''total_bill'')

# Correlation
corr = tips.corr()
sns.heatmap(corr, annot=True)
```

Analyze like a pro!',
 75,
 'intermediate'),

-- Module 7
('Data Analytics Project: Sales Analysis',
 'Apply all your skills in a comprehensive real-world project analyzing sales data.',
 '# Data Analytics Project: Sales Analysis

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

```python
import pandas as pd

# Load data
df = pd.read_csv(''sales_data.csv'')

# Clean data
df = df.dropna()
df[''Sales''] = df[''Quantity''] * df[''Price'']

# Analyze
monthly_sales = df.groupby(''Month'')[''Sales''].sum()
best_month = monthly_sales.idxmax()
```

## Deliverables

- Complete Jupyter notebook
- 5+ visualizations
- Business recommendations

Congratulations on completing the course!',
 120,
 'advanced');

-- Now link these modules to the Data Analytics with Python course
-- Course ID: 2ac6c8b7-60a2-4ccc-b763-f135d001c097

-- Get the IDs of the modules we just created
WITH new_modules AS (
  SELECT id, title,
    ROW_NUMBER() OVER (ORDER BY
      CASE
        WHEN title = 'Introduction to Data Analytics' THEN 1
        WHEN title = 'Python Environment Setup for Data Analytics' THEN 2
        WHEN title = 'NumPy Fundamentals for Data Analytics' THEN 3
        WHEN title = 'Pandas for Data Manipulation' THEN 4
        WHEN title = 'Data Visualization with Matplotlib' THEN 5
        WHEN title = 'Statistical Analysis with Seaborn' THEN 6
        WHEN title = 'Data Analytics Project: Sales Analysis' THEN 7
      END
    ) as order_num
  FROM learning_modules
  WHERE title IN (
    'Introduction to Data Analytics',
    'Python Environment Setup for Data Analytics',
    'NumPy Fundamentals for Data Analytics',
    'Pandas for Data Manipulation',
    'Data Visualization with Matplotlib',
    'Statistical Analysis with Seaborn',
    'Data Analytics Project: Sales Analysis'
  )
  AND created_at > NOW() - INTERVAL '1 minute'  -- Only get modules just created
)
INSERT INTO course_modules (course_id, module_id, order_index)
SELECT
  '2ac6c8b7-60a2-4ccc-b763-f135d001c097'::uuid,
  id,
  order_num
FROM new_modules;

-- Verify the modules were added
SELECT
  c.title as course_title,
  COUNT(cm.id) as module_count
FROM courses c
LEFT JOIN course_modules cm ON c.id = cm.course_id
WHERE c.id = '2ac6c8b7-60a2-4ccc-b763-f135d001c097'
GROUP BY c.title;

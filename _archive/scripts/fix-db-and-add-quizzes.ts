import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ChangeLog {
  task: string;
  changes: string[];
  errors: string[];
}

const changelog: ChangeLog[] = [];

// Helper function to log changes
function logChange(task: string, message: string, isError = false) {
  const existingTask = changelog.find(t => t.task === task);
  if (existingTask) {
    if (isError) {
      existingTask.errors.push(message);
    } else {
      existingTask.changes.push(message);
    }
  } else {
    changelog.push({
      task,
      changes: isError ? [] : [message],
      errors: isError ? [message] : []
    });
  }
}

// Task 1: Rename duplicate Kali Linux modules
async function renameKaliLinuxModules() {
  console.log('\n📝 Task 1: Renaming duplicate Kali Linux modules...');
  const task = 'Rename Kali Linux Modules';

  const modules = [
    {
      id: 'd07999a3-9419-4f61-a4dd-8c6c28f0f70c',
      title: 'Kali Linux - Introduction & Setup',
      description: 'Learn how to install and set up Kali Linux, understanding its purpose in cybersecurity and penetration testing. This module covers basic configuration and initial setup procedures.'
    },
    {
      id: 'db470d5c-c55a-4a51-abca-10fc70695dc2',
      title: 'Kali Linux - Basic Tools & Commands',
      description: 'Master essential Kali Linux command-line tools and utilities. Learn about basic navigation, package management, and commonly used security tools for beginners.'
    },
    {
      id: '38869900-46d1-4c4d-8aeb-2f98fba0cbfa',
      title: 'Kali Linux - Advanced Techniques',
      description: 'Explore advanced penetration testing techniques and sophisticated security tools in Kali Linux. Learn about network analysis, exploitation frameworks, and advanced security assessments.'
    }
  ];

  for (const module of modules) {
    const { data, error } = await supabase
      .from('learning_modules')
      .update({
        title: module.title,
        description: module.description
      })
      .eq('id', module.id)
      .select();

    if (error) {
      console.error(`  ❌ Failed to update module ${module.id}:`, error.message);
      logChange(task, `Failed to update module ${module.id}: ${error.message}`, true);
    } else {
      console.log(`  ✅ Updated: ${module.title}`);
      logChange(task, `Renamed module ${module.id} to "${module.title}"`);
    }
  }
}

// Task 2: Clean up orphaned progress records
async function cleanupOrphanedProgress() {
  console.log('\n🧹 Task 2: Cleaning up orphaned progress records...');
  const task = 'Clean Up Orphaned Progress';

  // Find orphaned progress records
  const { data: orphanedProgress, error: fetchError } = await supabase
    .from('user_progress')
    .select(`
      id,
      user_id,
      module_id,
      course_id,
      learning_modules(title)
    `);

  if (fetchError) {
    console.error('  ❌ Failed to fetch progress records:', fetchError.message);
    logChange(task, `Failed to fetch progress records: ${fetchError.message}`, true);
    return;
  }

  if (!orphanedProgress || orphanedProgress.length === 0) {
    console.log('  ℹ️  No progress records found');
    logChange(task, 'No progress records to check');
    return;
  }

  console.log(`  Found ${orphanedProgress.length} progress records to check...`);

  let orphanedCount = 0;
  let createdEnrollments = 0;
  let deletedProgress = 0;

  for (const progress of orphanedProgress) {
    // Check if enrollment exists
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', progress.user_id)
      .eq('course_id', progress.course_id)
      .single();

    if (!enrollment) {
      orphanedCount++;

      // Check if the course still exists
      const { data: course } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', progress.course_id)
        .single();

      if (course) {
        // Create the missing enrollment
        const { error: enrollError } = await supabase
          .from('course_enrollments')
          .insert({
            user_id: progress.user_id,
            course_id: progress.course_id,
            enrollment_date: new Date().toISOString(),
            status: 'in_progress'
          });

        if (enrollError) {
          console.log(`  ⚠️  Could not create enrollment for progress ${progress.id}, deleting orphaned record`);

          // Delete orphaned progress
          const { error: deleteError } = await supabase
            .from('user_progress')
            .delete()
            .eq('id', progress.id);

          if (!deleteError) {
            deletedProgress++;
            logChange(task, `Deleted orphaned progress record ${progress.id} (course: ${progress.course_id})`);
          }
        } else {
          createdEnrollments++;
          console.log(`  ✅ Created enrollment for user ${progress.user_id} in course "${course.title}"`);
          logChange(task, `Created missing enrollment for user ${progress.user_id} in course "${course.title}"`);
        }
      } else {
        // Course doesn't exist, delete the orphaned progress
        const { error: deleteError } = await supabase
          .from('user_progress')
          .delete()
          .eq('id', progress.id);

        if (!deleteError) {
          deletedProgress++;
          console.log(`  🗑️  Deleted orphaned progress for non-existent course ${progress.course_id}`);
          logChange(task, `Deleted orphaned progress ${progress.id} (course no longer exists)`);
        }
      }
    }
  }

  console.log(`  📊 Summary: ${orphanedCount} orphaned records found, ${createdEnrollments} enrollments created, ${deletedProgress} progress records deleted`);
  logChange(task, `Found ${orphanedCount} orphaned records, created ${createdEnrollments} enrollments, deleted ${deletedProgress} records`);
}

// Task 3: Add modules to Green Technology Foundations course
async function addGreenTechModules() {
  console.log('\n🌱 Task 3: Adding modules to Green Technology Foundations course...');
  const task = 'Add Green Technology Modules';

  const courseId = '611d1c31-b02e-43ca-9064-f294d24b6273';

  // Get the Green Economy Fundamentals category
  const { data: category, error: categoryError } = await supabase
    .from('module_categories')
    .select('id')
    .eq('name', 'Green Economy Fundamentals')
    .single();

  if (categoryError || !category) {
    console.error('  ❌ Green Economy Fundamentals category not found');
    logChange(task, 'Green Economy Fundamentals category not found', true);
    return;
  }

  // Get first user as author
  const { data: author } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single();

  if (!author) {
    console.error('  ❌ No user found for author');
    logChange(task, 'No user found for author', true);
    return;
  }

  // Check current module count for order_index
  const { data: existingModules } = await supabase
    .from('course_modules')
    .select('order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: false })
    .limit(1);

  let startOrderIndex = existingModules && existingModules.length > 0 ? existingModules[0].order_index + 1 : 0;

  const modules = [
    {
      title: 'Introduction to Green Technology',
      description: 'Explore the fundamentals of green technology and its role in sustainable development',
      content: `# Introduction to Green Technology

Welcome to the world of green technology! This module introduces you to the fundamental concepts and importance of sustainable technology in our modern world.

## What is Green Technology?

Green technology, also known as environmental technology or clean technology, refers to the application of environmental science to conserve the natural environment and resources, and to curb the negative impacts of human involvement.

## Key Principles

1. **Sustainability**: Meeting present needs without compromising future generations
2. **Cradle-to-cradle design**: Products designed for complete recyclability
3. **Source reduction**: Minimizing waste at the source
4. **Innovation**: Developing new technologies that reduce environmental impact
5. **Viability**: Ensuring economic feasibility of green solutions

## The Importance of Green Technology

Green technology is crucial for:
- Reducing carbon footprint and greenhouse gas emissions
- Conserving natural resources
- Protecting biodiversity
- Improving air and water quality
- Creating sustainable economic growth

## Current Trends

- Smart grid technology
- Green building materials
- Electric and hydrogen vehicles
- Waste-to-energy systems
- Vertical farming and aquaponics

## Practice Exercise

Research a green technology company in your area and analyze how their solutions contribute to sustainability goals.

## Discussion Questions

1. What are the biggest challenges facing green technology adoption?
2. How can individuals contribute to the green technology movement?
3. What role does government policy play in advancing green technology?`,
      duration: 60,
      keywords: ['sustainability', 'clean technology', 'environmental science', 'green innovation']
    },
    {
      title: 'Renewable Energy Fundamentals',
      description: 'Understand different types of renewable energy sources and their applications',
      content: `# Renewable Energy Fundamentals

Discover the power of renewable energy and how it's transforming our global energy landscape.

## Types of Renewable Energy

### Solar Energy
Solar power harnesses energy from the sun using photovoltaic cells or thermal collectors.

**Advantages:**
- Abundant and unlimited
- Low maintenance costs
- Scalable from residential to utility-scale

**Applications:**
- Residential solar panels
- Solar farms
- Solar water heating
- Portable solar chargers

### Wind Energy
Wind turbines convert kinetic energy from wind into electrical power.

**Key Concepts:**
- Onshore vs. offshore wind farms
- Capacity factors and efficiency
- Wind resource assessment

### Hydroelectric Power
Energy generated from moving water.

**Types:**
- Large-scale dams
- Run-of-river systems
- Tidal and wave energy

### Geothermal Energy
Heat from the Earth's core used for electricity generation and heating.

### Biomass Energy
Organic materials converted into energy through various processes.

## Energy Storage Solutions

Renewable energy requires effective storage:
- Lithium-ion batteries
- Pumped hydroelectric storage
- Compressed air energy storage
- Hydrogen fuel cells

## Grid Integration

Understanding how renewable energy integrates with existing power grids:
- Smart grid technology
- Load balancing
- Distributed generation
- Microgrids

## Economic Considerations

- Levelized cost of energy (LCOE)
- Return on investment
- Government incentives and subsidies
- Job creation in renewable sector

## Hands-On Exercise

Calculate the potential solar energy output for a residential building in your area using online solar calculators.`,
      duration: 75,
      keywords: ['solar energy', 'wind power', 'hydroelectric', 'renewable resources', 'energy storage']
    },
    {
      title: 'Sustainable Building Design',
      description: 'Learn principles of green architecture and sustainable construction practices',
      content: `# Sustainable Building Design

Explore how architecture and construction can minimize environmental impact while creating healthier, more efficient spaces.

## Green Building Principles

### Site Selection and Planning
- Brownfield redevelopment
- Protecting natural habitats
- Optimizing building orientation
- Minimizing site disturbance

### Energy Efficiency
- Passive solar design
- High-performance insulation
- Energy-efficient HVAC systems
- LED lighting and smart controls
- Building envelope optimization

### Water Conservation
- Low-flow fixtures
- Rainwater harvesting systems
- Greywater recycling
- Drought-resistant landscaping
- Permeable paving

### Material Selection
- Recycled and reclaimed materials
- Locally sourced materials
- Low-VOC (volatile organic compounds) products
- Rapidly renewable materials
- Durable, long-lasting materials

## Green Building Certifications

### LEED (Leadership in Energy and Environmental Design)
- Certification levels: Certified, Silver, Gold, Platinum
- Credit categories and point system
- Impact on property value

### BREEAM (Building Research Establishment Environmental Assessment Method)
- UK-based but internationally recognized
- Assessment categories

### Living Building Challenge
- Most rigorous green building standard
- Net-positive energy and water

### Passive House
- Ultra-low energy building standard
- Extreme energy efficiency

## Innovative Technologies

1. **Green Roofs**: Vegetation layers on rooftops for insulation and stormwater management
2. **Smart Glass**: Electrochromic windows that adjust tint automatically
3. **Phase-Change Materials**: Materials that absorb/release thermal energy
4. **Building-Integrated Photovoltaics**: Solar cells integrated into building materials

## Indoor Environmental Quality

- Natural daylighting strategies
- Ventilation and air quality
- Thermal comfort
- Acoustic design
- Biophilic design (connection to nature)

## Case Studies

Examine famous green buildings:
- The Edge (Amsterdam) - world's smartest building
- Bullitt Center (Seattle) - living building
- One Central Park (Sydney) - vertical gardens

## Project Assignment

Design a conceptual green building for your local community, incorporating at least 5 sustainable features discussed in this module.`,
      duration: 60,
      keywords: ['green building', 'sustainable architecture', 'LEED', 'energy efficiency', 'eco-friendly construction']
    },
    {
      title: 'Circular Economy Principles',
      description: 'Master the concepts of circular economy and waste reduction strategies',
      content: `# Circular Economy Principles

Transform your understanding of production and consumption through the lens of circular economy.

## What is Circular Economy?

The circular economy is an economic system aimed at eliminating waste and the continual use of resources. Unlike the traditional linear economy (take-make-dispose), a circular economy is regenerative by design.

## Core Principles

### 1. Design Out Waste and Pollution
- Rethink and redesign products and processes
- Eliminate toxic substances
- Design for durability and repairability

### 2. Keep Products and Materials in Use
- Extend product life through maintenance and repair
- Reuse and refurbishment
- Remanufacturing and recycling
- Sharing platforms and product-as-a-service models

### 3. Regenerate Natural Systems
- Return biological nutrients to the soil
- Support renewable energy
- Enhance ecosystem services

## The Butterfly Diagram

Understanding material flows:
- **Biological Cycle**: Organic materials that can safely return to nature
- **Technical Cycle**: Synthetic materials that must be kept in use

## Business Models in Circular Economy

### Product-as-a-Service
- Leasing instead of owning
- Examples: Philips lighting, Mud Jeans

### Sharing Platforms
- Collaborative consumption
- Examples: Tool libraries, car sharing

### Product Life Extension
- Repair services
- Spare parts availability
- Upgrade options

### Resource Recovery
- Industrial symbiosis
- Waste-to-resource initiatives

## Industry Applications

### Fashion and Textiles
- Clothing rental services
- Textile recycling technologies
- Sustainable materials

### Electronics
- Modular phone design (Fairphone)
- E-waste recycling
- Right to repair movement

### Food Systems
- Composting and anaerobic digestion
- Reducing food waste
- Regenerative agriculture

### Construction
- Deconstructable buildings
- Material passports
- Use of recycled materials

## Measuring Circularity

Key metrics:
- Material circularity indicator
- Circularity rate
- Waste reduction percentage
- Resource productivity

## Challenges and Barriers

- Initial investment costs
- Consumer behavior change
- Regulatory frameworks
- Technology limitations
- Supply chain complexity

## The Role of Technology

- IoT for product tracking and maintenance
- Blockchain for material transparency
- AI for sorting and recycling optimization
- Digital product passports

## Case Study: Interface Carpets

Explore how Interface transformed from linear to circular business model:
- Net-Works program (recycled fishing nets)
- Carbon negative products
- Circular manufacturing processes

## Action Plan Exercise

Develop a circular economy strategy for a product or service in your industry, outlining how to implement the three core principles.`,
      duration: 60,
      keywords: ['circular economy', 'waste reduction', 'sustainable production', 'recycling', 'resource efficiency']
    },
    {
      title: 'Green Technology Assessment',
      description: 'Test your knowledge of green technology concepts with this comprehensive assessment',
      content: `# Green Technology Assessment

This assessment evaluates your understanding of green technology concepts covered throughout the course.

## Assessment Format

**Duration**: 45 minutes
**Total Questions**: 40
**Passing Score**: 70%

### Section 1: Multiple Choice Questions (25 questions)

Test your knowledge on:
- Green technology fundamentals
- Renewable energy sources
- Sustainable building practices
- Circular economy principles
- Environmental impact assessment

### Section 2: True/False Questions (10 questions)

Quick assessment of key concepts and facts.

### Section 3: Short Answer Questions (5 questions)

Demonstrate your understanding through brief explanations:
- Explain the difference between solar PV and solar thermal
- Describe three key features of a LEED-certified building
- What are the three principles of circular economy?
- List five benefits of renewable energy
- How does green technology contribute to climate change mitigation?

## Assessment Topics Covered

1. **Introduction to Green Technology**
   - Definition and scope
   - Key principles
   - Importance and impact

2. **Renewable Energy**
   - Solar, wind, hydro, geothermal, biomass
   - Energy storage solutions
   - Grid integration

3. **Sustainable Building Design**
   - Green building principles
   - Certification systems (LEED, BREEAM, etc.)
   - Innovative technologies

4. **Circular Economy**
   - Core principles
   - Business models
   - Industry applications

## Preparation Tips

- Review all module content
- Focus on key definitions and principles
- Understand real-world applications
- Review case studies discussed in modules
- Practice calculations for renewable energy output
- Understand certification criteria for green buildings

## Grading Criteria

- **90-100%**: Outstanding - Excellent grasp of all concepts
- **80-89%**: Very Good - Strong understanding with minor gaps
- **70-79%**: Good - Satisfactory understanding, passing grade
- **Below 70%**: Needs Improvement - Review materials and retake

## Post-Assessment

After completing the assessment, you will receive:
- Detailed score breakdown by section
- Explanation of correct answers
- Areas for improvement
- Certificate of completion (if passed)

## Tips for Success

1. Read each question carefully
2. Manage your time effectively
3. Answer all questions (no penalty for guessing)
4. Review your answers before submitting
5. Use the knowledge you've gained from practical exercises

## Getting Started

When you're ready to begin your assessment, click the "Start Assessment" button below. Make sure you have:
- A stable internet connection
- 45 uninterrupted minutes
- A quiet environment
- Reviewed all module materials

Good luck!`,
      duration: 45,
      keywords: ['assessment', 'quiz', 'green technology test', 'certification', 'evaluation']
    }
  ];

  for (let i = 0; i < modules.length; i++) {
    const moduleData = modules[i];

    const { data: newModule, error: moduleError } = await supabase
      .from('learning_modules')
      .insert({
        title: moduleData.title,
        description: moduleData.description,
        content: moduleData.content,
        category_id: category.id,
        difficulty_level: 'beginner',
        estimated_duration_minutes: moduleData.duration,
        keywords: moduleData.keywords,
        author_id: author.id,
        status: 'published',
        published_at: new Date().toISOString()
      })
      .select()
      .single();

    if (moduleError) {
      console.error(`  ❌ Failed to create module "${moduleData.title}":`, moduleError.message);
      logChange(task, `Failed to create module "${moduleData.title}": ${moduleError.message}`, true);
      continue;
    }

    console.log(`  ✅ Created module: ${moduleData.title}`);
    logChange(task, `Created module "${moduleData.title}" (ID: ${newModule.id})`);

    // Link to course
    const { error: linkError } = await supabase
      .from('course_modules')
      .insert({
        course_id: courseId,
        module_id: newModule.id,
        order_index: startOrderIndex + i,
        is_required: true
      });

    if (linkError) {
      console.error(`  ❌ Failed to link module to course:`, linkError.message);
      logChange(task, `Failed to link module "${moduleData.title}" to course: ${linkError.message}`, true);
    } else {
      console.log(`  ✅ Linked to Green Technology Foundations course`);
      logChange(task, `Linked module "${moduleData.title}" to Green Technology Foundations course at position ${startOrderIndex + i}`);
    }
  }
}

// Task 4: Create quiz/assessment modules for popular courses
async function addQuizModules() {
  console.log('\n📝 Task 4: Adding quiz/assessment modules to popular courses...');
  const task = 'Add Quiz Modules';

  // Get first user as author
  const { data: author } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single();

  if (!author) {
    console.error('  ❌ No user found for author');
    logChange(task, 'No user found for author', true);
    return;
  }

  const quizzes = [
    {
      courseTitle: 'Introduction to Web Development',
      quizTitle: 'Web Dev Final Assessment',
      quizDescription: 'Comprehensive assessment covering HTML, CSS, JavaScript, and web development best practices',
      content: `# Web Development Final Assessment

Test your web development skills with this comprehensive final assessment.

## Assessment Overview

**Duration**: 45 minutes
**Total Questions**: 50
**Passing Score**: 75%
**Attempts Allowed**: 2

### What This Assessment Covers

This assessment evaluates your understanding of:
- HTML structure and semantic markup
- CSS styling, layouts, and responsive design
- JavaScript fundamentals and DOM manipulation
- Web development best practices
- Browser DevTools and debugging
- Version control with Git
- Web accessibility standards

## Assessment Structure

### Part 1: Multiple Choice (25 questions)
Test your theoretical knowledge of web development concepts, syntax, and best practices.

**Topics Include:**
- HTML5 semantic elements
- CSS selectors and specificity
- JavaScript data types and functions
- Responsive design principles
- Web performance optimization
- Cross-browser compatibility

### Part 2: Code Analysis (15 questions)
Analyze code snippets and identify:
- Syntax errors
- Logic problems
- Performance issues
- Best practice violations
- Security vulnerabilities

### Part 3: Practical Scenarios (10 questions)
Apply your knowledge to real-world scenarios:
- Debugging common web issues
- Choosing appropriate HTML elements
- Writing efficient CSS
- Implementing JavaScript functionality
- Optimizing page load times

## Sample Question Types

**HTML Example:**
"Which HTML5 element should be used for a standalone piece of content that could be distributed independently?"
- A) \`<div>\`
- B) \`<article>\`
- C) \`<section>\`
- D) \`<aside>\`

**CSS Example:**
"What is the specificity value of the selector \`.class #id div\`?"

**JavaScript Example:**
"What will be logged to the console?
\`\`\`javascript
const arr = [1, 2, 3];
arr.push(4);
console.log(arr.length);
\`\`\`"

## Topics Breakdown

### HTML (30% of assessment)
- Document structure
- Semantic HTML5 elements
- Forms and input types
- Meta tags and SEO
- Accessibility attributes

### CSS (35% of assessment)
- Box model
- Flexbox and Grid layouts
- Positioning and display
- Responsive design and media queries
- CSS animations and transitions
- Preprocessors (SASS/LESS concepts)

### JavaScript (35% of assessment)
- Variables, data types, and operators
- Functions and scope
- Arrays and objects
- DOM manipulation
- Event handling
- ES6+ features (arrow functions, destructuring, etc.)
- Asynchronous JavaScript (promises, async/await)

## Preparation Checklist

Before starting the assessment, ensure you can:
- [ ] Write semantic HTML structure
- [ ] Create responsive layouts using Flexbox/Grid
- [ ] Style elements with CSS including pseudo-classes
- [ ] Manipulate the DOM with JavaScript
- [ ] Handle events and user interactions
- [ ] Debug code using browser DevTools
- [ ] Understand version control basics
- [ ] Apply accessibility best practices

## Assessment Rules

1. **Time Limit**: You have 45 minutes to complete all questions
2. **Navigation**: You can move between questions and change answers
3. **Resources**: This is a closed-book assessment
4. **Submission**: Review your answers before final submission
5. **Retake Policy**: You may retake once after 24 hours if needed

## Grading Scale

- **90-100%**: Excellent - Ready for advanced topics
- **75-89%**: Good - Strong foundation with minor areas to review
- **60-74%**: Fair - Needs review before advancing
- **Below 60%**: Needs significant review

## After the Assessment

Upon completion, you'll receive:
- Overall score and percentage
- Section-by-section breakdown
- Correct answers and explanations
- Personalized study recommendations
- Certificate of completion (if passed)

## Tips for Success

1. **Read Carefully**: Pay attention to question wording
2. **Time Management**: Don't spend too long on any one question
3. **Code Review**: Carefully analyze code snippets
4. **Best Practices**: Choose answers that follow industry standards
5. **Eliminate Wrong Answers**: Use process of elimination
6. **Trust Your Knowledge**: Your first instinct is often correct

## Technical Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- JavaScript enabled
- Screen resolution: minimum 1024x768

## Ready to Begin?

Make sure you have:
- Reviewed all course materials
- Completed all practice exercises
- 45 uninterrupted minutes available
- Quiet testing environment

Good luck on your Web Development Final Assessment!`,
      duration: 45,
      keywords: ['assessment', 'web development', 'HTML', 'CSS', 'JavaScript', 'quiz', 'certification']
    },
    {
      courseTitle: 'SQL Database Mastery',
      quizTitle: 'SQL Skills Test',
      quizDescription: 'Practical assessment of SQL querying, database design, and optimization skills',
      content: `# SQL Skills Test

Demonstrate your SQL proficiency with this comprehensive skills assessment.

## Test Overview

**Duration**: 40 minutes
**Total Questions**: 45
**Passing Score**: 70%
**Format**: Multiple choice, SQL queries, and scenario-based questions

### Assessment Objectives

This test evaluates your ability to:
- Write efficient SQL queries
- Design normalized database schemas
- Optimize query performance
- Implement data integrity constraints
- Use advanced SQL features
- Troubleshoot common database issues

## Test Structure

### Section 1: SQL Fundamentals (15 questions)
Basic SQL operations and syntax:
- SELECT statements with WHERE clauses
- ORDER BY and LIMIT
- INSERT, UPDATE, DELETE operations
- Data types and constraints
- NULL handling

### Section 2: Advanced Queries (15 questions)
Complex query construction:
- JOIN operations (INNER, LEFT, RIGHT, FULL)
- Subqueries and nested queries
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- GROUP BY and HAVING clauses
- UNION and set operations
- Common Table Expressions (CTEs)
- Window functions

### Section 3: Database Design (10 questions)
Schema design and normalization:
- Entity-Relationship diagrams
- Normalization (1NF, 2NF, 3NF)
- Primary and foreign keys
- Indexes and constraints
- Database relationships (one-to-one, one-to-many, many-to-many)

### Section 4: Performance & Optimization (5 questions)
Query optimization and best practices:
- Index usage and creation
- Query execution plans
- Performance tuning techniques
- Avoiding N+1 queries
- Database design for performance

## Sample Questions

### Basic Query Example:
**Question:** "Write a query to select all customers from California who made purchases over $1000"

### Join Example:
**Question:** "Given tables 'orders' and 'customers', write a query to show customer names with their total order count"

### Aggregation Example:
**Question:** "Find the average order value by month for the year 2024"

### Design Example:
**Question:** "Design a normalized schema for a library system with books, authors, and borrowers"

## Topics Covered

### Data Retrieval (35%)
- SELECT statements
- Filtering with WHERE
- Sorting and limiting results
- Pattern matching with LIKE
- Date and time functions

### Data Manipulation (25%)
- INSERT statements
- UPDATE operations
- DELETE operations
- Transaction control (BEGIN, COMMIT, ROLLBACK)
- Data import/export concepts

### Table Operations (20%)
- JOIN types and usage
- Subqueries (correlated and non-correlated)
- Set operations
- Aggregate functions
- GROUP BY operations

### Database Design (15%)
- Schema design principles
- Normalization rules
- Constraints and indexes
- Data types selection
- Relationship modeling

### Advanced Topics (5%)
- Views and materialized views
- Stored procedures concepts
- Triggers
- Window functions
- Recursive queries

## Practical Scenarios

You'll be presented with real-world scenarios such as:

**E-commerce Database:**
- Query customer purchase history
- Calculate revenue metrics
- Identify top-selling products
- Track inventory levels

**Employee Management System:**
- Hierarchical queries for org charts
- Calculate payroll statistics
- Track attendance and leave
- Performance reporting

**Blog Platform:**
- Query posts with authors and comments
- Calculate engagement metrics
- Implement search functionality
- Manage user permissions

## Preparation Guidelines

### Must-Know Concepts:
- [ ] Basic SELECT syntax and filtering
- [ ] All JOIN types and when to use them
- [ ] Aggregate functions and grouping
- [ ] Subqueries and their performance implications
- [ ] Index concepts and usage
- [ ] Database normalization principles
- [ ] Transaction basics
- [ ] Common SQL functions (string, date, math)

### Recommended Practice:
1. Write queries for real datasets
2. Practice JOIN operations extensively
3. Understand EXPLAIN/EXPLAIN ANALYZE output
4. Design schemas for different use cases
5. Optimize slow queries
6. Work with sample databases (PostgreSQL Tutorial, MySQL Sakila)

## Test Rules and Guidelines

1. **Time Management**: 40 minutes for all questions
2. **Query Syntax**: Use standard SQL (PostgreSQL/MySQL compatible)
3. **Case Sensitivity**: Follow SQL naming conventions
4. **Resources**: Closed-book assessment
5. **Answer Format**: Follow exact formatting for query answers

## Grading Criteria

- **90-100%**: Expert - Ready for production database work
- **80-89%**: Advanced - Strong skills with minor refinement needed
- **70-79%**: Competent - Passing score, suitable for most tasks
- **60-69%**: Developing - Needs more practice
- **Below 60%**: Beginner - Significant review recommended

## What You'll Receive

After completing the assessment:
- Overall score and performance breakdown
- Correct answers with explanations
- Query optimization tips
- Recommended resources for improvement
- SQL Skills Certificate (if passed)
- Performance metrics compared to peers

## Common Mistakes to Avoid

1. **Forgetting JOIN conditions** - Always specify ON clause
2. **Using SELECT *** - Select only needed columns
3. **Not handling NULLs** - Remember NULL comparisons
4. **Incorrect GROUP BY** - All non-aggregated columns must be in GROUP BY
5. **Cartesian products** - Ensure proper JOIN conditions
6. **Inefficient subqueries** - Consider JOINs as alternatives

## Test Environment

The assessment uses:
- PostgreSQL 14+ compatible SQL
- Standard SQL syntax
- Real database schema for practical questions
- Interactive query editor
- Syntax highlighting and validation

## Technical Setup

Required:
- Modern web browser
- Stable internet connection
- Screen resolution: 1280x720 minimum
- JavaScript enabled

## Tips for Success

1. **Read the Schema**: Understand table relationships before querying
2. **Test Your Queries**: Verify logic before submitting
3. **Watch for Edge Cases**: Consider NULL values and empty results
4. **Optimize**: Choose efficient query methods
5. **Format Clearly**: Write readable, well-formatted SQL
6. **Time Allocation**: Spend more time on higher-point questions

## Ready to Test Your Skills?

Ensure you have:
- Completed all course modules
- Practiced with sample databases
- 40 uninterrupted minutes
- Reviewed JOIN operations and aggregations

Click "Start Test" when ready. Good luck!`,
      duration: 40,
      keywords: ['SQL', 'database', 'queries', 'assessment', 'testing', 'certification']
    },
    {
      courseTitle: 'Machine Learning Foundations',
      quizTitle: 'ML Concepts Quiz',
      quizDescription: 'Assessment covering fundamental machine learning algorithms, concepts, and applications',
      content: `# Machine Learning Concepts Quiz

Test your understanding of machine learning fundamentals with this comprehensive quiz.

## Quiz Overview

**Duration**: 35 minutes
**Total Questions**: 40
**Passing Score**: 75%
**Question Types**: Multiple choice, concept matching, and scenario analysis

### Learning Outcomes Assessed

This quiz evaluates your knowledge of:
- Machine learning paradigms and algorithms
- Model training and evaluation
- Feature engineering and data preprocessing
- Bias-variance tradeoff
- Overfitting and underfitting
- Model selection and hyperparameter tuning
- Practical ML applications

## Quiz Structure

### Part 1: Foundational Concepts (15 questions)
Core machine learning principles:
- Supervised vs. unsupervised vs. reinforcement learning
- Classification vs. regression
- Training, validation, and test sets
- Bias-variance tradeoff
- Overfitting and regularization
- Cross-validation techniques

### Part 2: Algorithms & Methods (15 questions)
Understanding ML algorithms:
- Linear regression
- Logistic regression
- Decision trees and random forests
- Support Vector Machines (SVM)
- K-Nearest Neighbors (KNN)
- Naive Bayes
- Neural networks basics
- K-means clustering
- Principal Component Analysis (PCA)

### Part 3: Model Evaluation (7 questions)
Metrics and assessment:
- Accuracy, precision, recall, F1-score
- Confusion matrix interpretation
- ROC curves and AUC
- Mean Squared Error (MSE), RMSE
- R-squared and adjusted R-squared
- Cross-validation strategies

### Part 4: Practical Applications (3 questions)
Real-world ML scenarios:
- Choosing appropriate algorithms
- Feature selection and engineering
- Handling imbalanced datasets
- Model deployment considerations

## Sample Questions

### Concept Question:
**Q:** "What is the primary difference between supervised and unsupervised learning?"
- A) Supervised learning uses labeled data, unsupervised does not
- B) Supervised learning is faster
- C) Unsupervised learning is more accurate
- D) There is no difference

### Algorithm Question:
**Q:** "Which algorithm would be most suitable for predicting house prices based on features like size, location, and age?"
- A) K-means clustering
- B) Linear regression
- C) PCA
- D) K-nearest neighbors

### Evaluation Question:
**Q:** "In a binary classification problem with imbalanced classes, which metric would be most informative?"
- A) Accuracy
- B) F1-score
- C) Number of parameters
- D) Training time

### Scenario Question:
**Q:** "Your model performs well on training data (95% accuracy) but poorly on test data (65% accuracy). What is the problem and solution?"

## Topics Breakdown

### Machine Learning Fundamentals (30%)
- Types of learning (supervised, unsupervised, reinforcement)
- Training vs. testing data
- Model generalization
- Feature and label concepts
- Learning curves
- ML workflow and pipeline

### Algorithms (35%)
**Supervised Learning:**
- Linear regression (simple and multiple)
- Logistic regression
- Decision trees
- Random forests
- Gradient boosting
- Support Vector Machines
- Neural networks introduction

**Unsupervised Learning:**
- K-means clustering
- Hierarchical clustering
- DBSCAN
- Principal Component Analysis (PCA)
- Association rules

### Data Preprocessing & Feature Engineering (15%)
- Data cleaning and handling missing values
- Feature scaling and normalization
- Encoding categorical variables
- Feature selection techniques
- Dimensionality reduction
- Train-test split strategies

### Model Evaluation & Selection (20%)
- Performance metrics for classification
- Performance metrics for regression
- Confusion matrix
- Cross-validation
- Hyperparameter tuning
- Model comparison techniques
- Ensemble methods

## Key Concepts to Review

### Bias-Variance Tradeoff
- High bias (underfitting)
- High variance (overfitting)
- Finding the balance

### Regularization
- L1 (Lasso) regularization
- L2 (Ridge) regularization
- Elastic Net
- Dropout (for neural networks)

### Ensemble Methods
- Bagging (Bootstrap Aggregating)
- Boosting
- Stacking
- Voting classifiers

### Performance Metrics

**Classification:**
- Accuracy = (TP + TN) / Total
- Precision = TP / (TP + FP)
- Recall = TP / (TP + FN)
- F1-Score = 2 * (Precision * Recall) / (Precision + Recall)

**Regression:**
- Mean Absolute Error (MAE)
- Mean Squared Error (MSE)
- Root Mean Squared Error (RMSE)
- R-squared (R²)

## Preparation Checklist

Make sure you understand:
- [ ] Difference between supervised and unsupervised learning
- [ ] When to use classification vs. regression
- [ ] Common ML algorithms and their use cases
- [ ] How to prevent overfitting
- [ ] Evaluation metrics for different problem types
- [ ] Feature engineering basics
- [ ] Cross-validation purpose and methods
- [ ] Bias-variance tradeoff
- [ ] Hyperparameter tuning concepts
- [ ] Practical considerations for model deployment

## Quiz Guidelines

1. **Time Limit**: 35 minutes total
2. **Question Navigation**: You can skip and return to questions
3. **No External Resources**: Closed-book assessment
4. **Answer Changes**: You can modify answers before submission
5. **Immediate Feedback**: Results provided upon completion

## Grading Scale

- **90-100%**: Excellent - Strong grasp of ML fundamentals
- **80-89%**: Very Good - Solid understanding with minor gaps
- **75-79%**: Good - Passing score, ready to advance
- **65-74%**: Fair - Review recommended areas
- **Below 65%**: Review core concepts and retake

## Post-Quiz Resources

After completing the quiz, you'll receive:
- Detailed score report
- Correct answers with explanations
- Concept areas needing improvement
- Recommended additional resources
- ML Foundations Certificate (if passed)
- Comparison with course average

## Common Pitfalls to Avoid

1. **Confusing classification and regression** - Know the difference
2. **Ignoring data preprocessing** - Critical for model performance
3. **Using accuracy for imbalanced data** - Use precision, recall, F1
4. **Not understanding overfitting** - Key ML concept
5. **Confusing training and testing** - Never test on training data
6. **Mixing up algorithms** - Know which algorithm for which task

## Real-World Applications Examples

Be prepared to identify ML applications:
- **Image Recognition**: Convolutional Neural Networks
- **Spam Detection**: Naive Bayes, Logistic Regression
- **Recommendation Systems**: Collaborative filtering
- **Fraud Detection**: Anomaly detection, Random Forests
- **Stock Prediction**: Time series models, regression
- **Customer Segmentation**: K-means clustering
- **Sentiment Analysis**: NLP with classification

## Mathematical Understanding

While no complex calculations are required, understand:
- Basic probability concepts
- Linear algebra basics (vectors, matrices)
- Gradient descent intuition
- Loss function concepts
- Optimization basics

## Python/Scikit-learn Concepts

Familiarity with common patterns:
\`\`\`python
# Train-test split
from sklearn.model_selection import train_test_split

# Model training
model.fit(X_train, y_train)

# Prediction
predictions = model.predict(X_test)

# Evaluation
from sklearn.metrics import accuracy_score
\`\`\`

## Tips for Success

1. **Understand Concepts**: Don't just memorize
2. **Read Carefully**: Questions may have subtle differences
3. **Process of Elimination**: Rule out obviously wrong answers
4. **Time Management**: Don't get stuck on difficult questions
5. **Trust Your Preparation**: You've learned this material
6. **Think Practically**: Apply real-world reasoning

## Technical Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- JavaScript and cookies enabled
- Minimum 1024x768 resolution

## Before You Begin

Confirm you have:
- Reviewed all course materials
- Completed hands-on exercises
- Understood key algorithms
- 35 uninterrupted minutes
- Quiet environment

## Ready to Test Your Knowledge?

Click "Start Quiz" when you're ready to demonstrate your machine learning expertise!

Remember: This quiz assesses understanding, not memorization. Think through each question carefully and apply the concepts you've learned.

Good luck!`,
      duration: 35,
      keywords: ['machine learning', 'ML', 'algorithms', 'assessment', 'AI', 'data science', 'quiz']
    }
  ];

  for (const quiz of quizzes) {
    // Find the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, category_id, difficulty_level, title')
      .ilike('title', `%${quiz.courseTitle}%`)
      .single();

    if (courseError || !course) {
      console.error(`  ❌ Course not found: ${quiz.courseTitle}`);
      logChange(task, `Course not found: ${quiz.courseTitle}`, true);
      continue;
    }

    console.log(`  📚 Found course: ${course.title}`);

    // Create the quiz module
    const { data: newModule, error: moduleError } = await supabase
      .from('learning_modules')
      .insert({
        title: quiz.quizTitle,
        description: quiz.quizDescription,
        content: quiz.content,
        category_id: course.category_id,
        difficulty_level: course.difficulty_level,
        estimated_duration_minutes: quiz.duration,
        keywords: quiz.keywords,
        author_id: author.id,
        status: 'published',
        published_at: new Date().toISOString()
      })
      .select()
      .single();

    if (moduleError) {
      console.error(`  ❌ Failed to create quiz "${quiz.quizTitle}":`, moduleError.message);
      logChange(task, `Failed to create quiz "${quiz.quizTitle}": ${moduleError.message}`, true);
      continue;
    }

    console.log(`  ✅ Created quiz: ${quiz.quizTitle}`);
    logChange(task, `Created quiz module "${quiz.quizTitle}" (ID: ${newModule.id})`);

    // Get current module count for order_index
    const { data: existingModules } = await supabase
      .from('course_modules')
      .select('order_index')
      .eq('course_id', course.id)
      .order('order_index', { ascending: false })
      .limit(1);

    const orderIndex = existingModules && existingModules.length > 0 ? existingModules[0].order_index + 1 : 0;

    // Link to course
    const { error: linkError } = await supabase
      .from('course_modules')
      .insert({
        course_id: course.id,
        module_id: newModule.id,
        order_index: orderIndex,
        is_required: true
      });

    if (linkError) {
      console.error(`  ❌ Failed to link quiz to course:`, linkError.message);
      logChange(task, `Failed to link quiz "${quiz.quizTitle}" to course: ${linkError.message}`, true);
    } else {
      console.log(`  ✅ Linked to course: ${course.title}`);
      logChange(task, `Linked quiz "${quiz.quizTitle}" to "${course.title}" at position ${orderIndex}`);
    }
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting Kiongozi LMS Database Fixes and Quiz Module Addition');
  console.log('================================================================\n');

  try {
    await renameKaliLinuxModules();
    await cleanupOrphanedProgress();
    await addGreenTechModules();
    await addQuizModules();

    console.log('\n================================================================');
    console.log('✅ All tasks completed!\n');

    // Print detailed changelog
    console.log('📊 DETAILED CHANGELOG:\n');
    for (const log of changelog) {
      console.log(`\n${log.task}:`);
      console.log('─'.repeat(50));

      if (log.changes.length > 0) {
        console.log('Changes:');
        log.changes.forEach(change => console.log(`  ✓ ${change}`));
      }

      if (log.errors.length > 0) {
        console.log('Errors:');
        log.errors.forEach(error => console.log(`  ✗ ${error}`));
      }
    }

    // Summary statistics
    console.log('\n📈 SUMMARY STATISTICS:');
    console.log('─'.repeat(50));
    const totalChanges = changelog.reduce((sum, log) => sum + log.changes.length, 0);
    const totalErrors = changelog.reduce((sum, log) => sum + log.errors.length, 0);
    console.log(`Total successful changes: ${totalChanges}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Tasks completed: ${changelog.length}`);

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

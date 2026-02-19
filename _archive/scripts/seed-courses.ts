import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const mockCourses = [
  {
    title: "Introduction to Web Development",
    slug: "intro-web-dev",
    description: "Learn the fundamentals of web development including HTML, CSS, and JavaScript. Build real-world projects and gain hands-on experience.",
    category: "Web Development",
    difficulty: "beginner",
    estimated_hours: 40,
    modules: [
      {
        title: "HTML Fundamentals",
        slug: "html-fundamentals",
        description: "Master the building blocks of the web",
        order_index: 0,
        content: `# HTML Fundamentals

Welcome to the first module! In this lesson, you'll learn the foundation of all web pages: HTML.

## What is HTML?

HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of a web page semantically.

## Basic Structure

Every HTML page follows this basic structure:

\`\`\`html
<!DOCTYPE html>
<html>
  <head>
    <title>My First Page</title>
  </head>
  <body>
    <h1>Hello World!</h1>
  </body>
</html>
\`\`\`

## Common Elements

- **Headings**: \`<h1>\` to \`<h6>\`
- **Paragraphs**: \`<p>\`
- **Links**: \`<a href="url">Link text</a>\`
- **Images**: \`<img src="image.jpg" alt="description">\`
- **Lists**: \`<ul>\`, \`<ol>\`, \`<li>\`

## Practice Exercise

Create a simple HTML page with:
1. A heading
2. A paragraph about yourself
3. A list of your hobbies
4. An image

## Next Steps

Once you're comfortable with basic HTML, move on to CSS styling!`
      },
      {
        title: "CSS Styling Basics",
        slug: "css-basics",
        description: "Style your web pages with CSS",
        order_index: 1,
        content: `# CSS Styling Basics

Now that you know HTML, let's make your pages beautiful with CSS!

## What is CSS?

CSS (Cascading Style Sheets) is used to style and layout web pages. It controls colors, fonts, spacing, and positioning.

## Adding CSS

There are three ways to add CSS:

1. **Inline**: \`<p style="color: blue;">Text</p>\`
2. **Internal**: In a \`<style>\` tag in the head
3. **External**: In a separate .css file (recommended)

## Selectors

\`\`\`css
/* Element selector */
p {
  color: blue;
}

/* Class selector */
.highlight {
  background-color: yellow;
}

/* ID selector */
#header {
  font-size: 24px;
}
\`\`\`

## The Box Model

Every element is a box with:
- **Content**: The actual content
- **Padding**: Space around content
- **Border**: A border around padding
- **Margin**: Space outside border

## Flexbox

Modern layout tool for responsive design:

\`\`\`css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
\`\`\`

## Practice Exercise

Style your HTML page from the previous module with:
1. Custom colors and fonts
2. Padding and margins
3. A simple navigation bar using Flexbox`
      },
      {
        title: "JavaScript Essentials",
        slug: "javascript-essentials",
        description: "Add interactivity with JavaScript",
        order_index: 2,
        content: `# JavaScript Essentials

Time to make your web pages interactive!

## What is JavaScript?

JavaScript is a programming language that adds interactivity to web pages. It runs in the browser and can manipulate HTML and CSS.

## Variables and Data Types

\`\`\`javascript
// Variables
let name = "John";
const age = 25;
var city = "New York"; // old way

// Data types
let number = 42;
let string = "Hello";
let boolean = true;
let array = [1, 2, 3];
let object = { name: "John", age: 25 };
\`\`\`

## Functions

\`\`\`javascript
// Function declaration
function greet(name) {
  return "Hello, " + name + "!";
}

// Arrow function
const greet = (name) => \`Hello, \${name}!\`;
\`\`\`

## DOM Manipulation

\`\`\`javascript
// Select elements
const heading = document.querySelector('h1');

// Change content
heading.textContent = 'New Heading';

// Add event listener
button.addEventListener('click', () => {
  alert('Button clicked!');
});
\`\`\`

## Practice Exercise

Create a simple calculator that:
1. Takes two numbers as input
2. Has buttons for +, -, *, /
3. Displays the result`
      },
      {
        title: "Building Your First Website",
        slug: "first-website",
        description: "Put it all together in a complete project",
        order_index: 3,
        content: `# Building Your First Website

Let's combine everything you've learned to build a complete personal portfolio website!

## Project Requirements

Your portfolio should include:
1. **Home page** with your name and introduction
2. **About section** with your background
3. **Projects section** showcasing your work
4. **Contact form** for visitors to reach you

## Step-by-Step Guide

### 1. Plan Your Layout

Sketch out your website structure:
- Header with navigation
- Hero section
- Content sections
- Footer

### 2. Create the HTML Structure

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Portfolio</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <nav><!-- Navigation --></nav>
  </header>
  <main>
    <section id="hero"><!-- Hero section --></section>
    <section id="about"><!-- About --></section>
    <section id="projects"><!-- Projects --></section>
    <section id="contact"><!-- Contact --></section>
  </main>
  <footer><!-- Footer --></footer>
  <script src="script.js"></script>
</body>
</html>
\`\`\`

### 3. Style with CSS

Use modern CSS techniques:
- Flexbox for layout
- CSS Grid for project gallery
- Responsive design with media queries
- Smooth animations

### 4. Add Interactivity

Implement features like:
- Smooth scrolling to sections
- Form validation
- Project filtering
- Mobile menu toggle

## Deployment

Once complete, deploy your website using:
- GitHub Pages (free)
- Netlify (free)
- Vercel (free)

Congratulations on building your first website!`
      }
    ]
  },
  {
    title: "Full Stack JavaScript",
    slug: "full-stack-javascript",
    description: "Master both frontend and backend development with JavaScript. Learn Node.js, Express, React, and MongoDB.",
    category: "Web Development",
    difficulty: "intermediate",
    estimated_hours: 80,
    modules: [
      {
        title: "Node.js Fundamentals",
        slug: "nodejs-fundamentals",
        description: "Learn server-side JavaScript",
        order_index: 0,
        content: `# Node.js Fundamentals

Welcome to backend development with Node.js!

## What is Node.js?

Node.js is a JavaScript runtime built on Chrome's V8 engine. It allows you to run JavaScript on the server.

## Setting Up

\`\`\`bash
# Check if Node.js is installed
node --version
npm --version

# Create a new project
mkdir my-node-app
cd my-node-app
npm init -y
\`\`\`

## Your First Server

\`\`\`javascript
// server.js
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Node.js!');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
\`\`\`

## NPM Packages

Node Package Manager (NPM) gives you access to millions of packages:

\`\`\`bash
# Install a package
npm install express

# Install as dev dependency
npm install --save-dev nodemon
\`\`\`

## File System Operations

\`\`\`javascript
const fs = require('fs');

// Read file
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// Write file
fs.writeFile('output.txt', 'Hello!', (err) => {
  if (err) throw err;
  console.log('File written');
});
\`\`\`

## Practice Exercise

Create a simple file-based note-taking app that can:
1. Create new notes
2. Read all notes
3. Delete notes`
      },
      {
        title: "Express.js Framework",
        slug: "express-framework",
        description: "Build web servers with Express",
        order_index: 1,
        content: `# Express.js Framework

Express is the most popular Node.js web framework. It makes building servers much easier!

## Installation

\`\`\`bash
npm install express
\`\`\`

## Basic Server

\`\`\`javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Hello Express!');
});

app.post('/api/users', (req, res) => {
  const user = req.body;
  res.json({ message: 'User created', user });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
\`\`\`

## Routing

\`\`\`javascript
// GET request
app.get('/users', (req, res) => {
  res.json(users);
});

// POST request
app.post('/users', (req, res) => {
  // Create user
});

// PUT request
app.put('/users/:id', (req, res) => {
  // Update user
});

// DELETE request
app.delete('/users/:id', (req, res) => {
  // Delete user
});
\`\`\`

## Middleware

\`\`\`javascript
// Custom middleware
const logger = (req, res, next) => {
  console.log(\`\${req.method} \${req.url}\`);
  next();
};

app.use(logger);
\`\`\`

## Practice Exercise

Build a RESTful API for a todo app with endpoints for:
1. GET /todos - List all todos
2. POST /todos - Create a todo
3. PUT /todos/:id - Update a todo
4. DELETE /todos/:id - Delete a todo`
      },
      {
        title: "MongoDB and Mongoose",
        slug: "mongodb-mongoose",
        description: "Database integration with MongoDB",
        order_index: 2,
        content: `# MongoDB and Mongoose

Learn to store and manage data with MongoDB!

## What is MongoDB?

MongoDB is a NoSQL database that stores data in flexible, JSON-like documents.

## Installation

\`\`\`bash
npm install mongoose
\`\`\`

## Connecting to MongoDB

\`\`\`javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
\`\`\`

## Schemas and Models

\`\`\`javascript
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  age: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
\`\`\`

## CRUD Operations

\`\`\`javascript
// Create
const user = new User({ name: 'John', email: 'john@example.com' });
await user.save();

// Read
const users = await User.find();
const user = await User.findById(id);

// Update
await User.findByIdAndUpdate(id, { name: 'Jane' });

// Delete
await User.findByIdAndDelete(id);
\`\`\`

## Practice Exercise

Create a blog API with:
1. User authentication
2. Create/read/update/delete posts
3. Comments on posts
4. User profiles`
      },
      {
        title: "React Frontend",
        slug: "react-frontend",
        description: "Build modern UIs with React",
        order_index: 3,
        content: `# React Frontend

Build dynamic user interfaces with React!

## What is React?

React is a JavaScript library for building user interfaces. It uses a component-based architecture.

## Setting Up

\`\`\`bash
npx create-react-app my-app
cd my-app
npm start
\`\`\`

## Components

\`\`\`javascript
// Functional component
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Using the component
<Welcome name="John" />
\`\`\`

## State and Hooks

\`\`\`javascript
import { useState, useEffect } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
\`\`\`

## Fetching Data

\`\`\`javascript
function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
\`\`\`

## Practice Exercise

Build a full-stack todo app connecting your React frontend to your Express/MongoDB backend!`
      }
    ]
  },
  {
    title: "Python for Beginners",
    slug: "python-beginners",
    description: "Start your programming journey with Python. Learn syntax, data structures, and problem-solving.",
    category: "Programming",
    difficulty: "beginner",
    estimated_hours: 35,
    modules: [
      {
        title: "Python Basics",
        slug: "python-basics",
        description: "Variables, data types, and operators",
        order_index: 0,
        content: `# Python Basics

Welcome to Python programming!

## Why Python?

Python is one of the most popular programming languages. It's:
- Easy to learn and read
- Versatile (web, data science, AI, automation)
- Has a huge community and libraries

## Your First Program

\`\`\`python
print("Hello, World!")
\`\`\`

## Variables and Data Types

\`\`\`python
# Numbers
age = 25
price = 19.99

# Strings
name = "Alice"
message = 'Hello, World!'

# Booleans
is_student = True
is_working = False

# Lists
fruits = ["apple", "banana", "orange"]

# Dictionaries
person = {
    "name": "Alice",
    "age": 25,
    "city": "New York"
}
\`\`\`

## Basic Operations

\`\`\`python
# Arithmetic
result = 10 + 5
result = 10 - 5
result = 10 * 5
result = 10 / 5
result = 10 ** 2  # Power

# String operations
greeting = "Hello, " + "World!"
repeated = "Ha" * 3  # "HaHaHa"

# Comparison
is_equal = 10 == 10
is_greater = 10 > 5
\`\`\`

## Input and Output

\`\`\`python
# Get user input
name = input("What's your name? ")
age = int(input("What's your age? "))

# Print output
print(f"Hello, {name}! You are {age} years old.")
\`\`\`

## Practice Exercise

Create a program that:
1. Asks for the user's name and age
2. Calculates their birth year
3. Prints a personalized message`
      },
      {
        title: "Control Flow",
        slug: "control-flow",
        description: "If statements, loops, and logic",
        order_index: 1,
        content: `# Control Flow

Learn to make decisions and repeat actions in your code!

## If Statements

\`\`\`python
age = 18

if age >= 18:
    print("You're an adult")
elif age >= 13:
    print("You're a teenager")
else:
    print("You're a child")
\`\`\`

## Loops

### For Loop

\`\`\`python
# Loop through a list
fruits = ["apple", "banana", "orange"]
for fruit in fruits:
    print(fruit)

# Loop through a range
for i in range(5):
    print(i)  # 0, 1, 2, 3, 4
\`\`\`

### While Loop

\`\`\`python
count = 0
while count < 5:
    print(count)
    count += 1
\`\`\`

## List Comprehensions

\`\`\`python
# Create a list of squares
squares = [x**2 for x in range(10)]

# Filter even numbers
evens = [x for x in range(10) if x % 2 == 0]
\`\`\`

## Practice Exercise

Create a number guessing game where:
1. The computer picks a random number (1-100)
2. The user tries to guess it
3. The program gives hints (too high/too low)
4. Counts the number of attempts`
      },
      {
        title: "Functions and Modules",
        slug: "functions-modules",
        description: "Organize your code effectively",
        order_index: 2,
        content: `# Functions and Modules

Learn to write reusable code!

## Functions

\`\`\`python
# Basic function
def greet(name):
    return f"Hello, {name}!"

# Call the function
message = greet("Alice")
print(message)
\`\`\`

## Parameters and Arguments

\`\`\`python
# Default parameters
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

# Multiple return values
def get_min_max(numbers):
    return min(numbers), max(numbers)

minimum, maximum = get_min_max([1, 5, 3, 9, 2])
\`\`\`

## Lambda Functions

\`\`\`python
# Anonymous functions
square = lambda x: x**2
print(square(5))  # 25

# With map
numbers = [1, 2, 3, 4, 5]
squared = list(map(lambda x: x**2, numbers))
\`\`\`

## Modules

\`\`\`python
# Import a module
import math
print(math.pi)
print(math.sqrt(16))

# Import specific functions
from random import randint, choice
number = randint(1, 10)
fruit = choice(["apple", "banana", "orange"])
\`\`\`

## Practice Exercise

Create a calculator module with functions for:
1. Basic operations (+, -, *, /)
2. Advanced operations (power, square root)
3. Import and use it in a main program`
      },
      {
        title: "Working with Files",
        slug: "working-files",
        description: "Read and write files in Python",
        order_index: 3,
        content: `# Working with Files

Learn to read and write data to files!

## Reading Files

\`\`\`python
# Read entire file
with open('file.txt', 'r') as f:
    content = f.read()
    print(content)

# Read line by line
with open('file.txt', 'r') as f:
    for line in f:
        print(line.strip())

# Read all lines into a list
with open('file.txt', 'r') as f:
    lines = f.readlines()
\`\`\`

## Writing Files

\`\`\`python
# Write to file (overwrites)
with open('output.txt', 'w') as f:
    f.write("Hello, World!\\n")

# Append to file
with open('output.txt', 'a') as f:
    f.write("New line\\n")

# Write multiple lines
lines = ["Line 1\\n", "Line 2\\n", "Line 3\\n"]
with open('output.txt', 'w') as f:
    f.writelines(lines)
\`\`\`

## Working with CSV

\`\`\`python
import csv

# Read CSV
with open('data.csv', 'r') as f:
    reader = csv.reader(f)
    for row in reader:
        print(row)

# Write CSV
data = [
    ['Name', 'Age', 'City'],
    ['Alice', 25, 'New York'],
    ['Bob', 30, 'San Francisco']
]

with open('output.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(data)
\`\`\`

## Practice Exercise

Create a contact management system that:
1. Stores contacts in a CSV file
2. Add new contacts
3. Search contacts by name
4. Display all contacts`
      }
    ]
  },
  {
    title: "Data Structures and Algorithms",
    slug: "dsa-fundamentals",
    description: "Master essential data structures and algorithms for technical interviews and efficient programming.",
    category: "Programming",
    difficulty: "intermediate",
    estimated_hours: 60,
    modules: [
      {
        title: "Arrays and Linked Lists",
        slug: "arrays-linked-lists",
        description: "Fundamental linear data structures",
        order_index: 0,
        content: `# Arrays and Linked Lists

Understanding the foundation of all data structures!

## Arrays

Arrays store elements in contiguous memory locations.

### Array Operations

\`\`\`python
# Creating arrays
arr = [1, 2, 3, 4, 5]

# Access: O(1)
element = arr[2]  # 3

# Search: O(n)
index = arr.index(4)

# Insert at end: O(1)
arr.append(6)

# Insert at position: O(n)
arr.insert(2, 10)

# Delete: O(n)
arr.remove(3)
\`\`\`

## Linked Lists

Linked lists store elements in nodes with pointers.

### Implementation

\`\`\`python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return

        current = self.head
        while current.next:
            current = current.next
        current.next = new_node

    def display(self):
        current = self.head
        while current:
            print(current.data, end=" -> ")
            current = current.next
        print("None")
\`\`\`

## Common Problems

### Two Pointers Technique

\`\`\`python
def remove_duplicates(arr):
    if len(arr) == 0:
        return 0

    i = 0
    for j in range(1, len(arr)):
        if arr[j] != arr[i]:
            i += 1
            arr[i] = arr[j]

    return i + 1
\`\`\`

### Reverse a Linked List

\`\`\`python
def reverse_list(head):
    prev = None
    current = head

    while current:
        next_node = current.next
        current.next = prev
        prev = current
        current = next_node

    return prev
\`\`\`

## Practice Exercise

Implement:
1. Merge two sorted arrays
2. Detect cycle in linked list
3. Find middle of linked list`
      }
    ]
  },
  {
    title: "React - The Complete Guide",
    slug: "react-complete",
    description: "Master React from basics to advanced topics including hooks, context, and performance optimization.",
    category: "Web Development",
    difficulty: "intermediate",
    estimated_hours: 70,
    modules: [
      {
        title: "React Fundamentals",
        slug: "react-fundamentals",
        description: "Components, props, and JSX",
        order_index: 0,
        content: `# React Fundamentals

Build modern user interfaces with React!

## What is React?

React is a JavaScript library for building user interfaces using a component-based architecture.

## JSX

JSX is a syntax extension that looks like HTML but works in JavaScript.

\`\`\`jsx
const element = <h1>Hello, World!</h1>;

const name = "Alice";
const greeting = <h1>Hello, {name}!</h1>;
\`\`\`

## Components

\`\`\`jsx
// Functional Component
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}

// Arrow function component
const Welcome = ({ name }) => {
  return <h1>Hello, {name}!</h1>;
};

// Using the component
<Welcome name="Alice" />
\`\`\`

## Props

Props pass data from parent to child components.

\`\`\`jsx
function UserCard({ name, email, avatar }) {
  return (
    <div className="user-card">
      <img src={avatar} alt={name} />
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}

// Usage
<UserCard
  name="Alice"
  email="alice@example.com"
  avatar="/avatar.jpg"
/>
\`\`\`

## Rendering Lists

\`\`\`jsx
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
\`\`\`

## Conditional Rendering

\`\`\`jsx
function Greeting({ isLoggedIn }) {
  return (
    <div>
      {isLoggedIn ? (
        <h1>Welcome back!</h1>
      ) : (
        <h1>Please sign in.</h1>
      )}
    </div>
  );
}
\`\`\`

## Practice Exercise

Build a product catalog with:
1. Product cards showing image, name, price
2. Filter by category
3. Sort by price`
      }
    ]
  },
  {
    title: "SQL Database Mastery",
    slug: "sql-mastery",
    description: "Learn SQL from basics to advanced queries, database design, and optimization.",
    category: "Database",
    difficulty: "beginner",
    estimated_hours: 45,
    modules: [
      {
        title: "SQL Basics",
        slug: "sql-basics",
        description: "SELECT, INSERT, UPDATE, DELETE",
        order_index: 0,
        content: `# SQL Basics

Master the language of databases!

## What is SQL?

SQL (Structured Query Language) is used to communicate with relational databases.

## SELECT Statement

\`\`\`sql
-- Select all columns
SELECT * FROM users;

-- Select specific columns
SELECT name, email FROM users;

-- With conditions
SELECT * FROM users WHERE age >= 18;

-- Sorting
SELECT * FROM users ORDER BY created_at DESC;

-- Limiting results
SELECT * FROM users LIMIT 10;
\`\`\`

## Filtering Data

\`\`\`sql
-- WHERE clause
SELECT * FROM products WHERE price > 100;

-- Multiple conditions
SELECT * FROM products
WHERE price > 100 AND category = 'Electronics';

-- IN operator
SELECT * FROM users
WHERE city IN ('New York', 'San Francisco', 'Boston');

-- LIKE operator (pattern matching)
SELECT * FROM users WHERE name LIKE 'A%';

-- BETWEEN operator
SELECT * FROM products WHERE price BETWEEN 50 AND 100;
\`\`\`

## Inserting Data

\`\`\`sql
-- Insert single row
INSERT INTO users (name, email, age)
VALUES ('Alice', 'alice@example.com', 25);

-- Insert multiple rows
INSERT INTO users (name, email, age)
VALUES
  ('Bob', 'bob@example.com', 30),
  ('Charlie', 'charlie@example.com', 28);
\`\`\`

## Updating Data

\`\`\`sql
-- Update rows
UPDATE users
SET age = 26
WHERE name = 'Alice';

-- Update multiple columns
UPDATE products
SET price = 99.99, stock = 50
WHERE id = 1;
\`\`\`

## Deleting Data

\`\`\`sql
-- Delete specific rows
DELETE FROM users WHERE id = 1;

-- Delete all rows (careful!)
DELETE FROM temp_data;
\`\`\`

## Practice Exercise

Create a database for a library:
1. Create tables for books, authors, members
2. Insert sample data
3. Write queries to find books by author
4. Update book availability`
      }
    ]
  },
  {
    title: "Machine Learning Foundations",
    slug: "ml-foundations",
    description: "Introduction to machine learning concepts, algorithms, and practical applications using Python.",
    category: "Data Science",
    difficulty: "intermediate",
    estimated_hours: 90,
    modules: [
      {
        title: "Introduction to Machine Learning",
        slug: "intro-ml",
        description: "Core concepts and terminology",
        order_index: 0,
        content: `# Introduction to Machine Learning

Welcome to the fascinating world of Machine Learning!

## What is Machine Learning?

Machine Learning is a subset of AI that enables computers to learn from data without being explicitly programmed.

## Types of Machine Learning

### 1. Supervised Learning
Learning from labeled data to make predictions.

**Examples:**
- Spam email detection
- House price prediction
- Image classification

### 2. Unsupervised Learning
Finding patterns in unlabeled data.

**Examples:**
- Customer segmentation
- Anomaly detection
- Recommendation systems

### 3. Reinforcement Learning
Learning through trial and error with rewards.

**Examples:**
- Game playing (Chess, Go)
- Robotics
- Self-driving cars

## The ML Workflow

1. **Data Collection**: Gather relevant data
2. **Data Preparation**: Clean and preprocess
3. **Feature Engineering**: Select/create features
4. **Model Selection**: Choose algorithm
5. **Training**: Fit model to data
6. **Evaluation**: Test performance
7. **Deployment**: Use in production

## Your First ML Model

\`\`\`python
from sklearn.linear_model import LinearRegression
import numpy as np

# Sample data
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([2, 4, 6, 8, 10])

# Create and train model
model = LinearRegression()
model.fit(X, y)

# Make prediction
prediction = model.predict([[6]])
print(f"Prediction: {prediction[0]}")  # ~12
\`\`\`

## Key Concepts

### Features and Labels
- **Features (X)**: Input variables
- **Labels (y)**: Output/target variable

### Training and Testing
Split data to evaluate model performance:
- Training set: 70-80%
- Testing set: 20-30%

### Overfitting vs Underfitting
- **Overfitting**: Model too complex, memorizes training data
- **Underfitting**: Model too simple, poor performance

## Practice Exercise

Build a simple house price predictor using:
1. Square footage as feature
2. Price as label
3. Linear regression model
4. Evaluate on test data`
      }
    ]
  },
  {
    title: "iOS App Development with Swift",
    slug: "ios-swift",
    description: "Build beautiful iOS apps with SwiftUI and Swift programming language.",
    category: "Mobile Development",
    difficulty: "beginner",
    estimated_hours: 55,
    modules: [
      {
        title: "Swift Programming Basics",
        slug: "swift-basics",
        description: "Learn Swift syntax and fundamentals",
        order_index: 0,
        content: `# Swift Programming Basics

Welcome to iOS development!

## What is Swift?

Swift is Apple's modern programming language for iOS, macOS, watchOS, and tvOS development.

## Variables and Constants

\`\`\`swift
// Variables (can change)
var name = "Alice"
var age = 25

// Constants (cannot change)
let pi = 3.14159
let appName = "MyApp"
\`\`\`

## Data Types

\`\`\`swift
// Explicit types
let number: Int = 42
let price: Double = 19.99
let message: String = "Hello"
let isActive: Bool = true

// Arrays
let fruits = ["Apple", "Banana", "Orange"]

// Dictionaries
let person = [
    "name": "Alice",
    "age": "25",
    "city": "New York"
]
\`\`\`

## Functions

\`\`\`swift
// Basic function
func greet(name: String) -> String {
    return "Hello, \\(name)!"
}

// Function with multiple parameters
func add(a: Int, b: Int) -> Int {
    return a + b
}

// Calling functions
let greeting = greet(name: "Alice")
let sum = add(a: 5, b: 3)
\`\`\`

## Control Flow

\`\`\`swift
// If statement
let age = 18
if age >= 18 {
    print("Adult")
} else {
    print("Minor")
}

// Switch statement
let fruit = "Apple"
switch fruit {
case "Apple":
    print("It's an apple")
case "Banana":
    print("It's a banana")
default:
    print("Unknown fruit")
}

// For loop
for i in 1...5 {
    print(i)
}

// While loop
var count = 0
while count < 5 {
    print(count)
    count += 1
}
\`\`\`

## Optionals

\`\`\`swift
// Optional variable
var email: String? = "user@example.com"

// Optional binding
if let unwrappedEmail = email {
    print("Email: \\(unwrappedEmail)")
} else {
    print("No email")
}

// Nil coalescing
let displayEmail = email ?? "No email provided"
\`\`\`

## Classes and Structs

\`\`\`swift
// Struct
struct User {
    var name: String
    var age: Int

    func greet() -> String {
        return "Hello, I'm \\(name)"
    }
}

// Class
class Vehicle {
    var brand: String
    var year: Int

    init(brand: String, year: Int) {
        self.brand = brand
        self.year = year
    }

    func description() -> String {
        return "\\(brand) - \\(year)"
    }
}
\`\`\`

## Practice Exercise

Create a simple grade calculator:
1. Take array of scores
2. Calculate average
3. Determine letter grade
4. Handle edge cases with optionals`
      }
    ]
  },
  {
    title: "DevOps and CI/CD",
    slug: "devops-cicd",
    description: "Learn modern DevOps practices, Docker, Kubernetes, and continuous integration/deployment.",
    category: "DevOps",
    difficulty: "advanced",
    estimated_hours: 75,
    modules: [
      {
        title: "Docker Fundamentals",
        slug: "docker-fundamentals",
        description: "Containerization with Docker",
        order_index: 0,
        content: `# Docker Fundamentals

Master containerization for modern application deployment!

## What is Docker?

Docker is a platform for developing, shipping, and running applications in containers.

## Why Docker?

- **Consistency**: Same environment everywhere
- **Isolation**: Each app in its own container
- **Portability**: Run anywhere Docker runs
- **Efficiency**: Lightweight vs VMs

## Docker Architecture

- **Images**: Templates for containers
- **Containers**: Running instances of images
- **Dockerfile**: Instructions to build an image
- **Registry**: Store and share images (Docker Hub)

## Your First Dockerfile

\`\`\`dockerfile
# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
\`\`\`

## Building and Running

\`\`\`bash
# Build image
docker build -t myapp:1.0 .

# Run container
docker run -p 3000:3000 myapp:1.0

# Run in detached mode
docker run -d -p 3000:3000 myapp:1.0

# View running containers
docker ps

# Stop container
docker stop <container-id>

# Remove container
docker rm <container-id>
\`\`\`

## Docker Compose

Manage multi-container applications:

\`\`\`yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
\`\`\`

\`\`\`bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down
\`\`\`

## Best Practices

1. **Use specific versions**: \`node:18-alpine\` not \`node:latest\`
2. **Minimize layers**: Combine RUN commands
3. **Use .dockerignore**: Exclude unnecessary files
4. **Multi-stage builds**: Reduce image size
5. **Run as non-root user**: Security

## Practice Exercise

Dockerize a full-stack application:
1. Frontend (React)
2. Backend (Node.js)
3. Database (PostgreSQL)
4. Use Docker Compose to orchestrate`
      }
    ]
  },
  {
    title: "Cybersecurity Essentials",
    slug: "cybersecurity-essentials",
    description: "Learn fundamental cybersecurity concepts, threats, and defensive strategies.",
    category: "Security",
    difficulty: "beginner",
    estimated_hours: 50,
    modules: [
      {
        title: "Security Fundamentals",
        slug: "security-fundamentals",
        description: "Core security concepts and principles",
        order_index: 0,
        content: `# Security Fundamentals

Understand the foundation of cybersecurity!

## The CIA Triad

The three pillars of information security:

### 1. Confidentiality
Ensuring data is accessible only to authorized users.

**Methods:**
- Encryption
- Access controls
- Authentication

### 2. Integrity
Ensuring data hasn't been tampered with.

**Methods:**
- Hashing
- Digital signatures
- Checksums

### 3. Availability
Ensuring systems and data are accessible when needed.

**Methods:**
- Redundancy
- Backups
- DDoS protection

## Common Threats

### 1. Malware
Malicious software including:
- **Viruses**: Self-replicating programs
- **Ransomware**: Encrypts data for ransom
- **Trojans**: Disguised as legitimate software
- **Spyware**: Secretly monitors activity

### 2. Phishing
Fraudulent attempts to obtain sensitive information.

**Example:**
\`\`\`
Subject: Urgent: Verify Your Account

Dear User,

Your account will be suspended unless you verify your
credentials immediately. Click here: [malicious-link]
\`\`\`

### 3. Social Engineering
Manipulating people to divulge confidential information.

**Techniques:**
- Pretexting
- Baiting
- Quid pro quo
- Tailgating

## Authentication Methods

### Something You Know
- Passwords
- PINs
- Security questions

### Something You Have
- Security tokens
- Smart cards
- Mobile devices

### Something You Are
- Fingerprints
- Facial recognition
- Iris scans

## Password Security

### Best Practices

\`\`\`python
# Good password characteristics
# - At least 12 characters
# - Mix of upper/lowercase
# - Numbers and symbols
# - Unique for each account

# Example strong password
password = "Tr0pic@l!Sunset#2024"

# Using a passphrase
passphrase = "Coffee-Dragon-Music-42!"
\`\`\`

### Password Hashing

\`\`\`python
import hashlib

# Hash a password
password = "mySecretPassword"
hashed = hashlib.sha256(password.encode()).hexdigest()

print(f"Original: {password}")
print(f"Hashed: {hashed}")

# Hashing is one-way!
# Cannot reverse hash to get original password
\`\`\`

## Encryption Basics

### Symmetric Encryption
Same key for encryption and decryption.

\`\`\`python
from cryptography.fernet import Fernet

# Generate key
key = Fernet.generate_key()
cipher = Fernet(key)

# Encrypt
message = b"Secret message"
encrypted = cipher.encrypt(message)

# Decrypt
decrypted = cipher.decrypt(encrypted)
\`\`\`

### Asymmetric Encryption
Public key for encryption, private key for decryption.

**Use cases:**
- HTTPS/TLS
- Email encryption (PGP)
- Digital signatures

## Network Security

### Firewalls
Filter network traffic based on rules.

### VPNs
Create secure, encrypted connections over public networks.

### HTTPS
Encrypted HTTP using TLS/SSL.

## Practice Exercise

Create a security audit checklist:
1. Password strength checker
2. Identify weak authentication
3. Check for encryption usage
4. Review access controls`
      }
    ]
  }
];

async function seedCourses() {
  console.log('🌱 Starting course seeding...');

  try {
    // First, get or create categories
    const categories = [...new Set(mockCourses.map(c => c.category))];
    console.log(`📚 Creating ${categories.length} categories...`);

    for (const categoryName of categories) {
      const { error } = await supabase
        .from('module_categories')
        .upsert({
          name: categoryName,
          description: `Courses related to ${categoryName}`,
          color: '#10B981',
          icon: '📚',
          display_order: 0
        }, {
          onConflict: 'name'
        });

      if (error) {
        console.error(`Error creating category ${categoryName}:`, error);
      } else {
        console.log(`✅ Category: ${categoryName}`);
      }
    }

    // Now create courses and modules
    console.log(`\n📖 Creating ${mockCourses.length} courses...`);

    for (const courseData of mockCourses) {
      // Get category ID
      const { data: category } = await supabase
        .from('module_categories')
        .select('id')
        .eq('slug', courseData.category.toLowerCase().replace(/\s+/g, '-'))
        .single();

      if (!category) {
        console.error(`Category not found: ${courseData.category}`);
        continue;
      }

      // Create course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .upsert({
          title: courseData.title,
          slug: courseData.slug,
          description: courseData.description,
          category_id: category.id,
          difficulty: courseData.difficulty,
          estimated_hours: courseData.estimated_hours,
          is_published: true
        }, {
          onConflict: 'slug'
        })
        .select()
        .single();

      if (courseError) {
        console.error(`Error creating course ${courseData.title}:`, courseError);
        continue;
      }

      console.log(`\n✅ Course: ${courseData.title}`);

      // Create modules for this course
      for (const moduleData of courseData.modules) {
        // First create the learning module
        const { data: learningModule, error: moduleError } = await supabase
          .from('learning_modules')
          .upsert({
            title: moduleData.title,
            slug: `${courseData.slug}-${moduleData.slug}`,
            description: moduleData.description,
            content: moduleData.content,
            category_id: category.id,
            difficulty: courseData.difficulty,
            estimated_minutes: 60,
            is_published: true
          }, {
            onConflict: 'slug'
          })
          .select()
          .single();

        if (moduleError) {
          console.error(`  Error creating module ${moduleData.title}:`, moduleError);
          continue;
        }

        // Link module to course
        const { error: linkError } = await supabase
          .from('course_modules')
          .upsert({
            course_id: course.id,
            module_id: learningModule.id,
            order_index: moduleData.order_index
          }, {
            onConflict: 'course_id,module_id'
          });

        if (linkError) {
          console.error(`  Error linking module ${moduleData.title}:`, linkError);
        } else {
          console.log(`  ✓ Module: ${moduleData.title}`);
        }
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

seedCourses();

import matplotlib.pyplot as plt
import numpy as np
import base64
import io
import json
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import seaborn as sns
from datetime import datetime

app = FastAPI(title="Kiongozi Chart Generator API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChartRequest(BaseModel):
    chart_type: str  # 'bar', 'pie', 'line', 'scatter'
    title: str
    data: Dict[str, Any]
    labels: Optional[List[str]] = None
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    colors: Optional[List[str]] = None
    theme: Optional[str] = "light"  # or "dark"

# Sample data for demonstration
SAMPLE_ELECTION_DATA = {
    "2017": {
        "presidential": {
            "Uhuru Kenyatta": 54.17,
            "Raila Odinga": 44.94,
            "Others": 0.89
        },
        "voter_turnout": {
            "regions": ["Nairobi", "Central", "Eastern", "Western", "Rift Valley", "Nyanza", "Coast", "North Eastern"],
            "percentages": [63.7, 78.6, 70.2, 65.9, 73.4, 67.8, 60.2, 52.3]
        }
    },
    "2022": {
        "presidential": {
            "William Ruto": 50.49,
            "Raila Odinga": 48.85,
            "Others": 0.66
        },
        "voter_turnout": {
            "regions": ["Nairobi", "Central", "Eastern", "Western", "Rift Valley", "Nyanza", "Coast", "North Eastern"],
            "percentages": [58.2, 73.4, 67.8, 63.1, 75.2, 65.3, 57.5, 48.9]
        }
    }
}

GOVERNANCE_INDICES = {
    "years": [2018, 2019, 2020, 2021, 2022, 2023],
    "transparency": [42, 43, 40, 41, 43, 44],
    "accountability": [38, 39, 40, 42, 43, 44],
    "rule_of_law": [45, 44, 42, 43, 45, 46],
    "public_participation": [36, 38, 40, 42, 44, 45]
}

COUNTY_BUDGETS = {
    "counties": ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"],
    "education": [35, 28, 32, 30, 26],
    "health": [42, 38, 40, 36, 34],
    "infrastructure": [15, 25, 20, 26, 30],
    "agriculture": [8, 9, 8, 8, 10]
}

def apply_theme(theme):
    """Apply the specified theme to the plot"""
    if theme == "dark":
        plt.style.use("dark_background")
        text_color = "white"
    else:
        plt.style.use("default")
        text_color = "black"
    return text_color

def generate_bar_chart(data, title, labels=None, x_label=None, y_label=None, colors=None, theme="light"):
    """Generate a bar chart"""
    text_color = apply_theme(theme)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    if isinstance(data, dict):
        labels = labels or list(data.keys())
        values = list(data.values())
        
        bars = ax.bar(labels, values, color=colors or sns.color_palette("viridis", len(labels)))
        
        # Add value labels on top of bars
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                    f'{height:.1f}%' if height < 100 else f'{int(height)}',
                    ha='center', va='bottom', color=text_color)
    elif isinstance(data, list):
        x = range(len(data))
        bars = ax.bar(x, data, color=colors or sns.color_palette("viridis", len(data)))
        if labels:
            ax.set_xticks(x)
            ax.set_xticklabels(labels, rotation=45, ha="right")
            
        # Add value labels
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                    f'{height:.1f}%' if height < 100 else f'{int(height)}',
                    ha='center', va='bottom', color=text_color)
    
    ax.set_title(title, fontsize=16, color=text_color)
    if x_label:
        ax.set_xlabel(x_label, fontsize=12, color=text_color)
    if y_label:
        ax.set_ylabel(y_label, fontsize=12, color=text_color)
    
    # Customize grid and spines
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.tick_params(colors=text_color)
    
    plt.tight_layout()
    
    # Convert plot to base64 encoded image
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    plt.close(fig)
    
    encoded = base64.b64encode(image_png).decode('utf-8')
    return encoded

def generate_pie_chart(data, title, labels=None, colors=None, theme="light"):
    """Generate a pie chart"""
    text_color = apply_theme(theme)
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    if isinstance(data, dict):
        labels = labels or list(data.keys())
        values = list(data.values())
    else:
        values = data
    
    # Calculate wedge properties
    wedges, texts, autotexts = ax.pie(
        values, 
        labels=None,  # We'll add custom legend
        autopct='%1.1f%%',
        startangle=90,
        colors=colors or sns.color_palette("viridis", len(values)),
        wedgeprops=dict(width=0.5, edgecolor='w'),
        textprops=dict(color=text_color)
    )
    
    # Equal aspect ratio ensures that pie is drawn as a circle
    ax.axis('equal')
    
    # Add a legend
    ax.legend(wedges, labels, loc="center left", bbox_to_anchor=(1, 0, 0.5, 1))
    
    ax.set_title(title, fontsize=16, color=text_color)
    
    plt.tight_layout()
    
    # Convert plot to base64 encoded image
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    plt.close(fig)
    
    encoded = base64.b64encode(image_png).decode('utf-8')
    return encoded

def generate_line_chart(data, title, x_values=None, y_label=None, legend_labels=None, colors=None, theme="light"):
    """Generate a line chart with multiple series"""
    text_color = apply_theme(theme)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Handle different data formats
    if isinstance(data, dict) and all(isinstance(v, list) for v in data.values()):
        # Multiple lines from dict of lists
        for i, (label, values) in enumerate(data.items()):
            if x_values and len(x_values) == len(values):
                ax.plot(x_values, values, label=label, linewidth=2.5, 
                       marker='o', markersize=6, 
                       color=colors[i] if colors and i < len(colors) else None)
            else:
                ax.plot(values, label=label, linewidth=2.5, 
                       marker='o', markersize=6,
                       color=colors[i] if colors and i < len(colors) else None)
    elif isinstance(data, list) and all(isinstance(item, (int, float)) for item in data):
        # Single line from list
        if x_values and len(x_values) == len(data):
            ax.plot(x_values, data, linewidth=2.5, marker='o', markersize=6, 
                   label=legend_labels[0] if legend_labels else None,
                   color=colors[0] if colors else None)
        else:
            ax.plot(data, linewidth=2.5, marker='o', markersize=6, 
                   label=legend_labels[0] if legend_labels else None,
                   color=colors[0] if colors else None)
    
    # Customize grid
    ax.grid(True, linestyle='--', alpha=0.7)
    
    # Customize spines
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    # Set labels and title
    ax.set_title(title, fontsize=16, color=text_color)
    if x_values:
        ax.set_xticks(range(len(x_values)))
        ax.set_xticklabels(x_values, rotation=45 if len(str(x_values[0])) > 4 else 0)
    if y_label:
        ax.set_ylabel(y_label, fontsize=12, color=text_color)
    
    # Add legend if needed
    if legend_labels or isinstance(data, dict):
        ax.legend(loc='best', frameon=True, facecolor='white' if theme == 'light' else 'black', 
                 edgecolor='gray', framealpha=0.8)
    
    ax.tick_params(colors=text_color)
    
    plt.tight_layout()
    
    # Convert plot to base64 encoded image
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    plt.close(fig)
    
    encoded = base64.b64encode(image_png).decode('utf-8')
    return encoded

@app.post("/generate-chart/")
async def create_chart(request: ChartRequest):
    """Generate a chart based on the provided data and parameters"""
    try:
        chart_type = request.chart_type.lower()
        
        if chart_type == "bar":
            image = generate_bar_chart(
                request.data, 
                request.title,
                request.labels,
                request.x_axis, 
                request.y_axis,
                request.colors,
                request.theme
            )
        elif chart_type == "pie":
            image = generate_pie_chart(
                request.data,
                request.title,
                request.labels,
                request.colors,
                request.theme
            )
        elif chart_type == "line":
            image = generate_line_chart(
                request.data,
                request.title,
                request.x_axis.split(",") if isinstance(request.x_axis, str) else request.x_axis,
                request.y_axis,
                request.labels,
                request.colors,
                request.theme
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Chart type '{chart_type}' not supported. Use 'bar', 'pie', or 'line'."
            )
            
        return {
            "image": f"data:image/png;base64,{image}",
            "chart_type": chart_type,
            "title": request.title
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/election-data/{year}")
async def get_election_data(year: str):
    """Get election data for a specific year"""
    if year not in SAMPLE_ELECTION_DATA:
        raise HTTPException(
            status_code=404,
            detail=f"No data available for year {year}"
        )
    return SAMPLE_ELECTION_DATA[year]

@app.get("/governance-indices/")
async def get_governance_indices():
    """Get governance indices data"""
    return GOVERNANCE_INDICES

@app.get("/county-budgets/")
async def get_county_budgets():
    """Get county budget allocation data"""
    return COUNTY_BUDGETS

@app.get("/election-chart/{year}/{chart_type}")
async def get_election_chart(
    year: str, 
    chart_type: str,
    theme: str = Query("light", description="Chart theme, either 'light' or 'dark'")
):
    """Generate election-related charts"""
    if year not in SAMPLE_ELECTION_DATA:
        raise HTTPException(status_code=404, detail=f"No data available for year {year}")
    
    data = SAMPLE_ELECTION_DATA[year]
    
    if chart_type == "presidential":
        return {
            "image": f"data:image/png;base64,{generate_pie_chart(
                data['presidential'],
                f"{year} Presidential Election Results",
                theme=theme
            )}",
            "chart_type": "pie",
            "title": f"{year} Presidential Election Results"
        }
    elif chart_type == "turnout":
        return {
            "image": f"data:image/png;base64,{generate_bar_chart(
                data['voter_turnout']['percentages'],
                f"{year} Voter Turnout by Region",
                labels=data['voter_turnout']['regions'],
                y_label="Turnout Percentage",
                theme=theme
            )}",
            "chart_type": "bar",
            "title": f"{year} Voter Turnout by Region"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Chart type '{chart_type}' not supported. Use 'presidential' or 'turnout'."
        )

@app.get("/governance-chart/{indicator}")
async def get_governance_chart(
    indicator: str,
    theme: str = Query("light", description="Chart theme, either 'light' or 'dark'")
):
    """Generate governance indicator charts"""
    valid_indicators = ["transparency", "accountability", "rule_of_law", "public_participation"]
    
    if indicator == "all":
        # Create a multi-line chart with all indicators
        data = {
            key: GOVERNANCE_INDICES[key] 
            for key in valid_indicators
        }
        
        return {
            "image": f"data:image/png;base64,{generate_line_chart(
                data,
                f"Governance Indicators (2018-2023)",
                x_values=GOVERNANCE_INDICES["years"],
                y_label="Score (0-100)",
                theme=theme
            )}",
            "chart_type": "line",
            "title": f"Governance Indicators (2018-2023)"
        }
    elif indicator in valid_indicators:
        return {
            "image": f"data:image/png;base64,{generate_line_chart(
                GOVERNANCE_INDICES[indicator],
                f"{indicator.replace('_', ' ').title()} Index (2018-2023)",
                x_values=GOVERNANCE_INDICES["years"],
                y_label="Score (0-100)",
                theme=theme
            )}",
            "chart_type": "line",
            "title": f"{indicator.replace('_', ' ').title()} Index (2018-2023)"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Indicator '{indicator}' not supported. Use {', '.join(valid_indicators)} or 'all'."
        )

@app.get("/county-budget-chart/{county}")
async def get_county_budget_chart(
    county: str,
    theme: str = Query("light", description="Chart theme, either 'light' or 'dark'")
):
    """Generate county budget allocation charts"""
    if county not in COUNTY_BUDGETS["counties"] and county != "all":
        raise HTTPException(
            status_code=404,
            detail=f"No data available for county '{county}'"
        )
    
    if county == "all":
        # Create a grouped bar chart for all counties
        df = pd.DataFrame({
            "Education": COUNTY_BUDGETS["education"],
            "Health": COUNTY_BUDGETS["health"],
            "Infrastructure": COUNTY_BUDGETS["infrastructure"],
            "Agriculture": COUNTY_BUDGETS["agriculture"]
        }, index=COUNTY_BUDGETS["counties"])
        
        ax = df.plot(kind="bar", figsize=(10, 6), width=0.8)
        plt.title("Budget Allocation Across Counties", fontsize=16)
        plt.xlabel("County", fontsize=12)
        plt.ylabel("Percentage of Budget", fontsize=12)
        plt.xticks(rotation=45)
        plt.legend(title="Sector")
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        
        # Convert plot to base64 encoded image
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_png = buffer.getvalue()
        buffer.close()
        plt.close()
        
        encoded = base64.b64encode(image_png).decode('utf-8')
        
        return {
            "image": f"data:image/png;base64,{encoded}",
            "chart_type": "bar",
            "title": "Budget Allocation Across Counties"
        }
    else:
        idx = COUNTY_BUDGETS["counties"].index(county)
        data = {
            "Education": COUNTY_BUDGETS["education"][idx],
            "Health": COUNTY_BUDGETS["health"][idx],
            "Infrastructure": COUNTY_BUDGETS["infrastructure"][idx],
            "Agriculture": COUNTY_BUDGETS["agriculture"][idx]
        }
        
        return {
            "image": f"data:image/png;base64,{generate_pie_chart(
                data,
                f"{county} County Budget Allocation",
                theme=theme
            )}",
            "chart_type": "pie",
            "title": f"{county} County Budget Allocation"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
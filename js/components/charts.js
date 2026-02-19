// Charts Component - Reusable chart configurations and utilities

// Chart instances storage
const chartInstances = {};

// Chart colors
const CHART_COLORS = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    orange: '#f97316',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    indigo: '#6366f1'
};

// Chart color arrays for datasets
const CHART_COLOR_ARRAYS = {
    primary: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
    success: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
    warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'],
    danger: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'],
    info: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']
};

// Initialize a new chart
function initChart(elementId, type, data, options = {}) {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return null;

    // Destroy existing chart instance if it exists
    if (chartInstances[elementId]) {
        chartInstances[elementId].destroy();
    }

    // Default chart options
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                    },
                    color: '#6b7280'
                }
            },
            tooltip: {
                backgroundColor: '#1f2937',
                titleColor: '#f9fafb',
                bodyColor: '#e5e7eb',
                borderColor: '#374151',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += formatChartValue(context.parsed.y, context.dataset.format);
                        } else if (context.parsed !== null) {
                            label += formatChartValue(context.parsed, context.dataset.format);
                        }
                        return label;
                    }
                }
            }
        },
        layout: {
            padding: {
                top: 10,
                bottom: 10,
                left: 10,
                right: 10
            }
        }
    };

    // Merge options
    const mergedOptions = mergeDeep(defaultOptions, options);

    // Create new chart
    chartInstances[elementId] = new Chart(ctx, {
        type: type,
        data: data,
        options: mergedOptions
    });

    return chartInstances[elementId];
}

// Format chart values based on type
function formatChartValue(value, format = 'number') {
    if (value === null || value === undefined) return '';

    switch(format) {
        case 'currency':
            return formatCurrency(value);
        case 'percentage':
            return value.toFixed(1) + '%';
        case 'hours':
            const hours = Math.floor(value);
            const minutes = Math.round((value - hours) * 60);
            return hours + 'h ' + minutes + 'm';
        case 'compact':
            if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
            }
            return value.toString();
        default:
            return value.toString();
    }
}

// Create line chart
function createLineChart(elementId, data, options = {}) {
    const defaultData = {
        labels: [],
        datasets: [{
            label: 'Dataset',
            data: [],
            borderColor: CHART_COLORS.primary,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: CHART_COLORS.primary,
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return initChart(elementId, 'line', mergedData, options);
}

// Create bar chart
function createBarChart(elementId, data, options = {}) {
    const defaultData = {
        labels: [],
        datasets: [{
            label: 'Dataset',
            data: [],
            backgroundColor: CHART_COLORS.primary,
            borderRadius: 8,
            barPercentage: 0.7,
            categoryPercentage: 0.8
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    
    const defaultOptions = {
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    display: true,
                    color: 'rgba(107, 114, 128, 0.1)'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };

    const mergedOptions = mergeDeep(defaultOptions, options);
    return initChart(elementId, 'bar', mergedData, mergedOptions);
}

// Create pie chart
function createPieChart(elementId, data, options = {}) {
    const defaultData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: CHART_COLOR_ARRAYS.primary,
            borderWidth: 0
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    
    const defaultOptions = {
        cutout: '0%',
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };

    const mergedOptions = mergeDeep(defaultOptions, options);
    return initChart(elementId, 'pie', mergedData, mergedOptions);
}

// Create doughnut chart
function createDoughnutChart(elementId, data, options = {}) {
    const defaultData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: CHART_COLOR_ARRAYS.primary,
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    
    const defaultOptions = {
        cutout: '70%',
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };

    const mergedOptions = mergeDeep(defaultOptions, options);
    return initChart(elementId, 'doughnut', mergedData, mergedOptions);
}

// Create radar chart
function createRadarChart(elementId, data, options = {}) {
    const defaultData = {
        labels: [],
        datasets: [{
            label: 'Dataset',
            data: [],
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: CHART_COLORS.primary,
            borderWidth: 2,
            pointBackgroundColor: CHART_COLORS.primary,
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointRadius: 4
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    
    const defaultOptions = {
        scales: {
            r: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(107, 114, 128, 0.1)'
                },
                pointLabels: {
                    font: {
                        size: 11,
                        family: "'Inter', sans-serif"
                    },
                    color: '#6b7280'
                }
            }
        }
    };

    const mergedOptions = mergeDeep(defaultOptions, options);
    return initChart(elementId, 'radar', mergedData, mergedOptions);
}

// Create polar area chart
function createPolarAreaChart(elementId, data, options = {}) {
    const defaultData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: CHART_COLOR_ARRAYS.primary,
            borderWidth: 0
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    
    const defaultOptions = {
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        return `${label}: ${value}`;
                    }
                }
            }
        }
    };

    const mergedOptions = mergeDeep(defaultOptions, options);
    return initChart(elementId, 'polarArea', mergedData, mergedOptions);
}

// Create bubble chart
function createBubbleChart(elementId, data, options = {}) {
    const defaultData = {
        datasets: [{
            label: 'Dataset',
            data: [],
            backgroundColor: CHART_COLORS.primary
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return initChart(elementId, 'bubble', mergedData, options);
}

// Create scatter chart
function createScatterChart(elementId, data, options = {}) {
    const defaultData = {
        datasets: [{
            label: 'Dataset',
            data: [],
            backgroundColor: CHART_COLORS.primary,
            pointRadius: 6,
            pointHoverRadius: 8
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return initChart(elementId, 'scatter', mergedData, options);
}

// Create mixed chart (combination of chart types)
function createMixedChart(elementId, data, options = {}) {
    return initChart(elementId, 'bar', data, options);
}

// Update chart data
function updateChartData(elementId, newData) {
    if (chartInstances[elementId]) {
        chartInstances[elementId].data = newData;
        chartInstances[elementId].update();
    }
}

// Update chart options
function updateChartOptions(elementId, newOptions) {
    if (chartInstances[elementId]) {
        chartInstances[elementId].options = mergeDeep(chartInstances[elementId].options, newOptions);
        chartInstances[elementId].update();
    }
}

// Destroy chart
function destroyChart(elementId) {
    if (chartInstances[elementId]) {
        chartInstances[elementId].destroy();
        delete chartInstances[elementId];
    }
}

// Destroy all charts
function destroyAllCharts() {
    Object.keys(chartInstances).forEach(key => {
        chartInstances[key].destroy();
    });
    chartInstances = {};
}

// Helper function to merge objects deeply
function mergeDeep(target, source) {
    if (!isObject(target) || !isObject(source)) {
        return source;
    }

    Object.keys(source).forEach(key => {
        const targetValue = target[key];
        const sourceValue = source[key];

        if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
            target[key] = targetValue.concat(sourceValue);
        } else if (isObject(targetValue) && isObject(sourceValue)) {
            target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
        } else {
            target[key] = sourceValue;
        }
    });

    return target;
}

// Helper function to check if value is an object
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

// Create project progress chart
function createProjectProgressChart(elementId, data) {
    const defaultData = {
        labels: ['Idea', 'Planning', 'Execution', 'Monitoring', 'Closure'],
        datasets: [{
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
                CHART_COLORS.purple,
                CHART_COLORS.indigo,
                CHART_COLORS.info,
                CHART_COLORS.success,
                CHART_COLORS.warning
            ]
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createDoughnutChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Projects by Phase',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        }
    });
}

// Create team workload chart
function createTeamWorkloadChart(elementId, data) {
    const defaultData = {
        labels: [],
        datasets: [{
            label: 'Tasks Assigned',
            data: [],
            backgroundColor: CHART_COLORS.primary
        }, {
            label: 'Tasks Completed',
            data: [],
            backgroundColor: CHART_COLORS.success
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createBarChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Team Workload',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Tasks'
                }
            }
        }
    });
}

// Create task trend chart
function createTaskTrendChart(elementId, data) {
    const defaultData = {
        labels: [],
        datasets: [{
            label: 'Tasks Created',
            data: [],
            borderColor: CHART_COLORS.info,
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
        }, {
            label: 'Tasks Completed',
            data: [],
            borderColor: CHART_COLORS.success,
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createLineChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Task Completion Trend',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Tasks'
                }
            }
        }
    });
}

// Create budget utilization chart
function createBudgetChart(elementId, data) {
    const defaultData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: CHART_COLOR_ARRAYS.primary
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createPieChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Budget Allocation by Project',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        }
    });
}

// Create resource allocation chart
function createResourceChart(elementId, data) {
    const defaultData = {
        labels: [],
        datasets: [{
            label: 'Current Allocation',
            data: [],
            backgroundColor: CHART_COLORS.primary
        }, {
            label: 'Available Capacity',
            data: [],
            backgroundColor: CHART_COLORS.success
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createBarChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Resource Allocation',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Resources'
                }
            }
        }
    });
}

// Create artist performance chart
function createArtistPerformanceChart(elementId, data) {
    const defaultData = {
        labels: [],
        datasets: [{
            label: 'Tasks Completed',
            data: [],
            borderColor: CHART_COLORS.primary,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createLineChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Artist Performance',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Tasks Completed'
                }
            }
        }
    });
}

// Create time tracking chart
function createTimeChart(elementId, data) {
    const defaultData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Hours Worked',
            data: [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: CHART_COLORS.primary,
            borderRadius: 8
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createBarChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Weekly Time Tracking',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Hours'
                }
            }
        }
    });
}

// Create expense breakdown chart
function createExpenseChart(elementId, data) {
    const defaultData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: CHART_COLOR_ARRAYS.warning
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createPieChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Expense Breakdown by Category',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        }
    });
}

// Create client activity chart
function createClientActivityChart(elementId, data) {
    const defaultData = {
        labels: [],
        datasets: [{
            label: 'Client Interactions',
            data: [],
            borderColor: CHART_COLORS.success,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createLineChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Client Activity',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Interactions'
                }
            }
        }
    });
}

// Create revenue chart
function createRevenueChart(elementId, data) {
    const defaultData = {
        labels: [],
        datasets: [{
            label: 'Revenue',
            data: [],
            borderColor: CHART_COLORS.success,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
        }, {
            label: 'Expenses',
            data: [],
            borderColor: CHART_COLORS.danger,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
        }]
    };

    const mergedData = mergeDeep(defaultData, data);
    return createLineChart(elementId, mergedData, {
        plugins: {
            title: {
                display: true,
                text: 'Revenue vs Expenses',
                font: {
                    size: 16,
                    weight: '600'
                },
                color: '#1f2937',
                padding: 20
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Amount'
                },
                ticks: {
                    callback: function(value) {
                        return formatCurrency(value);
                    }
                }
            }
        }
    });
}

// Create dashboard summary charts
function createDashboardCharts(data) {
    const charts = {};

    // Project Progress Chart
    if (document.getElementById('projectProgressChart')) {
        charts.projectProgress = createProjectProgressChart('projectProgressChart', {
            datasets: [{
                data: data.projectProgress || [12, 19, 25, 8, 5]
            }]
        });
    }

    // Team Workload Chart
    if (document.getElementById('teamWorkloadChart')) {
        charts.teamWorkload = createTeamWorkloadChart('teamWorkloadChart', {
            labels: data.teamMembers || ['John', 'Sarah', 'Mike', 'Lisa', 'David'],
            datasets: [{
                data: data.tasksAssigned || [8, 12, 6, 9, 7]
            }, {
                data: data.tasksCompleted || [5, 8, 4, 7, 6]
            }]
        });
    }

    // Task Trend Chart
    if (document.getElementById('taskTrendChart')) {
        charts.taskTrend = createTaskTrendChart('taskTrendChart', {
            labels: data.weeks || ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                data: data.tasksCreated || [15, 22, 18, 25]
            }, {
                data: data.tasksCompleted || [12, 18, 15, 22]
            }]
        });
    }

    // Budget Chart
    if (document.getElementById('budgetChart')) {
        charts.budget = createBudgetChart('budgetChart', {
            labels: data.projects || ['Project A', 'Project B', 'Project C', 'Project D'],
            datasets: [{
                data: data.budgets || [45000, 32000, 28000, 15000]
            }]
        });
    }

    // Resource Chart
    if (document.getElementById('resourceChart')) {
        charts.resource = createResourceChart('resourceChart', {
            labels: data.departments || ['Design', 'Development', 'Marketing', 'Sales'],
            datasets: [{
                data: data.currentAllocation || [5, 8, 3, 4]
            }, {
                data: data.availableCapacity || [10, 12, 5, 6]
            }]
        });
    }

    return charts;
}

// Export chart functions
window.chartInstances = chartInstances;
window.CHART_COLORS = CHART_COLORS;
window.CHART_COLOR_ARRAYS = CHART_COLOR_ARRAYS;
window.initChart = initChart;
window.createLineChart = createLineChart;
window.createBarChart = createBarChart;
window.createPieChart = createPieChart;
window.createDoughnutChart = createDoughnutChart;
window.createRadarChart = createRadarChart;
window.createPolarAreaChart = createPolarAreaChart;
window.createBubbleChart = createBubbleChart;
window.createScatterChart = createScatterChart;
window.createMixedChart = createMixedChart;
window.createProjectProgressChart = createProjectProgressChart;
window.createTeamWorkloadChart = createTeamWorkloadChart;
window.createTaskTrendChart = createTaskTrendChart;
window.createBudgetChart = createBudgetChart;
window.createResourceChart = createResourceChart;
window.createArtistPerformanceChart = createArtistPerformanceChart;
window.createTimeChart = createTimeChart;
window.createExpenseChart = createExpenseChart;
window.createClientActivityChart = createClientActivityChart;
window.createRevenueChart = createRevenueChart;
window.createDashboardCharts = createDashboardCharts;
window.updateChartData = updateChartData;
window.updateChartOptions = updateChartOptions;
window.destroyChart = destroyChart;
window.destroyAllCharts = destroyAllCharts;

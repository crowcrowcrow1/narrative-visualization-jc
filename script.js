let currentSlide = 1;
const totalSlides = 4;
let salesData = [];
let processedData = {};

const colorScheme = {
    wine: '#722f37',
    beer: '#f39c12',
    liquor: '#8e44ad',
    retail: '#3498db',
    warehouse: '#e74c3c'
};

document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    const data = await d3.csv('Warehouse_and_Retail_Sales.csv');
    
    salesData = data.map(d => ({
        year: +d.YEAR,
        month: +d.MONTH,
        supplier: d.SUPPLIER,
        itemCode: d['ITEM CODE'],
        itemDescription: d['ITEM DESCRIPTION'],
        itemType: d['ITEM TYPE'],
        retailSales: +d['RETAIL SALES'] || 0,
        retailTransfers: +d['RETAIL TRANSFERS'] || 0,
        warehouseSales: +d['WAREHOUSE SALES'] || 0
    }));
    
    processData();
    initializeSlides();
}

function processData() {
    processedData.byCategory = d3.rollup(salesData,
        v => ({
            retailSales: d3.sum(v, d => d.retailSales),
            warehouseSales: d3.sum(v, d => d.warehouseSales),
            totalSales: d3.sum(v, d => d.retailSales + d.warehouseSales)
        }),
        d => d.itemType
    );
    
    processedData.byTime = d3.rollup(salesData,
        v => ({
            retailSales: d3.sum(v, d => d.retailSales),
            warehouseSales: d3.sum(v, d => d.warehouseSales),
            totalSales: d3.sum(v, d => d.retailSales + d.warehouseSales)
        }),
        d => d.year,
        d => d.month
    );
    
    processedData.bySupplier = d3.rollup(salesData,
        v => ({
            retailSales: d3.sum(v, d => d.retailSales),
            warehouseSales: d3.sum(v, d => d.warehouseSales),
            totalSales: d3.sum(v, d => d.retailSales + d.warehouseSales),
            itemType: v[0].itemType
        }),
        d => d.supplier
    );
}

function initializeSlides() {
    createSlide1();
    createSlide2();
    createSlide3();
    createSlide4();
    
    document.getElementById('category-select').addEventListener('change', updateSlide2);
    document.getElementById('year-select').addEventListener('change', updateSlide3);
    document.getElementById('metric-select').addEventListener('change', updateSlide4);
}

function createSlide1() {
    const container = d3.select('#chart-1');
    container.selectAll('*').remove();
    
    const margin = {top: 40, right: 40, bottom: 80, left: 80};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const categoryData = Array.from(processedData.byCategory, ([key, value]) => ({
        category: key, ...value
    })).sort((a, b) => b.totalSales - a.totalSales);
    
    const xScale = d3.scaleBand()
        .domain(categoryData.map(d => d.category))
        .range([0, width])
        .padding(0.2);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(categoryData, d => d.totalSales)])
        .range([height, 0]);
    
    const bars = g.selectAll('.bar')
        .data(categoryData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.category))
        .attr('width', xScale.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', d => colorScheme[d.category.toLowerCase()])
        .on('mouseover', function(event, d) {
            showTooltip(event, `
                <strong>${d.category}</strong><br/>
                Total: $${d3.format(',.0f')(d.totalSales)}<br/>
                Retail: $${d3.format(',.0f')(d.retailSales)}<br/>
                Warehouse: $${d3.format(',.0f')(d.warehouseSales)}
            `);
        })
        .on('mouseout', hideTooltip);
    
    bars.transition()
        .duration(1000)
        .delay((d, i) => i * 200)
        .attr('y', d => yScale(d.totalSales))
        .attr('height', d => height - yScale(d.totalSales));
    
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
    
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale).tickFormat(d3.format('.2s')));
    
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .text('Total Sales ($)');
    
    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 20)
        .style('text-anchor', 'middle')
        .text('Product Category');
    
    setTimeout(() => {
        const topCategory = categoryData[0];
        const annotations = [{
            note: {
                label: `${topCategory.category} leads with $${d3.format('.2s')(topCategory.totalSales)}`,
                title: "Market Leader"
            },
            x: xScale(topCategory.category) + xScale.bandwidth() / 2,
            y: yScale(topCategory.totalSales),
            dy: -50,
            dx: 50
        }];
        
        g.append('g').call(d3.annotation().annotations(annotations));
    }, 1500);
}

function createSlide2() { updateSlide2(); }

function updateSlide2() {
    const selectedCategory = document.getElementById('category-select').value;
    const container = d3.select('#chart-2');
    container.selectAll('*').remove();
    
    const margin = {top: 40, right: 40, bottom: 80, left: 80};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    let timeData = [];
    
    if (selectedCategory === 'all') {
        for (let [year, monthData] of processedData.byTime) {
            for (let [month, values] of monthData) {
                timeData.push({
                    date: new Date(year, month - 1),
                    value: values.totalSales
                });
            }
        }
    } else {
        const categoryData = salesData.filter(d => d.itemType === selectedCategory);
        const categoryTimeData = d3.rollup(categoryData,
            v => d3.sum(v, d => d.retailSales + d.warehouseSales),
            d => d.year, d => d.month
        );
        
        for (let [year, monthData] of categoryTimeData) {
            for (let [month, value] of monthData) {
                timeData.push({
                    date: new Date(year, month - 1),
                    value: value
                });
            }
        }
    }
    
    timeData.sort((a, b) => a.date - b.date);
    
    const xScale = d3.scaleTime()
        .domain(d3.extent(timeData, d => d.date))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(timeData, d => d.value)])
        .range([height, 0]);
    
    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);
    
    const path = g.append('path')
        .datum(timeData)
        .attr('class', 'line')
        .attr('stroke', selectedCategory === 'all' ? '#3498db' : colorScheme[selectedCategory.toLowerCase()])
        .attr('d', line);
    
    const totalLength = path.node().getTotalLength();
    path.attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(2000)
        .attr('stroke-dashoffset', 0);
    
    g.selectAll('.dot')
        .data(timeData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.value))
        .attr('r', 0)
        .attr('fill', selectedCategory === 'all' ? '#3498db' : colorScheme[selectedCategory.toLowerCase()])
        .transition()
        .delay(2000)
        .duration(500)
        .attr('r', 4);
    
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%Y-%m')));
    
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale).tickFormat(d3.format('.2s')));
    
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .text('Sales ($)');
    
    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 20)
        .style('text-anchor', 'middle')
        .text('Time Period');
}

function createSlide3() { updateSlide3(); }

function updateSlide3() {
    const selectedYear = document.getElementById('year-select').value;
    const container = d3.select('#chart-3');
    container.selectAll('*').remove();
    
    const margin = {top: 40, right: 40, bottom: 80, left: 80};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    let filteredData = salesData;
    if (selectedYear !== 'all') {
        filteredData = salesData.filter(d => d.year === +selectedYear);
    }
    
    const channelData = d3.rollup(filteredData,
        v => ({
            retail: d3.sum(v, d => d.retailSales),
            warehouse: d3.sum(v, d => d.warehouseSales)
        }),
        d => d.itemType
    );
    
    const data = Array.from(channelData, ([category, values]) => ({
        category, ...values
    }));
    
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.category))
        .range([0, width])
        .padding(0.2);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.retail, d.warehouse))])
        .range([height, 0]);
    
    const barWidth = xScale.bandwidth() / 2;
    
    g.selectAll('.bar-retail')
        .data(data)
        .enter().append('rect')
        .attr('class', 'bar-retail')
        .attr('x', d => xScale(d.category))
        .attr('width', barWidth)
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', colorScheme.retail)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 200)
        .attr('y', d => yScale(d.retail))
        .attr('height', d => height - yScale(d.retail));
    
    g.selectAll('.bar-warehouse')
        .data(data)
        .enter().append('rect')
        .attr('class', 'bar-warehouse')
        .attr('x', d => xScale(d.category) + barWidth)
        .attr('width', barWidth)
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', colorScheme.warehouse)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 200 + 500)
        .attr('y', d => yScale(d.warehouse))
        .attr('height', d => height - yScale(d.warehouse));
    
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
    
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale).tickFormat(d3.format('.2s')));
    
    const legend = g.append('g')
        .attr('transform', `translate(${width - 120}, 20)`);
    
    legend.append('rect').attr('width', 15).attr('height', 15).attr('fill', colorScheme.retail);
    legend.append('text').attr('x', 20).attr('y', 12).text('Retail Sales');
    legend.append('rect').attr('y', 25).attr('width', 15).attr('height', 15).attr('fill', colorScheme.warehouse);
    legend.append('text').attr('x', 20).attr('y', 37).text('Warehouse Sales');
}

function createSlide4() { updateSlide4(); }

function updateSlide4() {
    const selectedMetric = document.getElementById('metric-select').value;
    const container = d3.select('#chart-4');
    container.selectAll('*').remove();
    
    const margin = {top: 40, right: 40, bottom: 120, left: 200};
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.bottom - margin.top;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const supplierData = Array.from(processedData.bySupplier, ([supplier, values]) => ({
        supplier: supplier.length > 30 ? supplier.substring(0, 30) + '...' : supplier,
        fullSupplier: supplier,
        retail: values.retailSales,
        warehouse: values.warehouseSales,
        total: values.totalSales,
        itemType: values.itemType
    }));
    
    const metricKey = selectedMetric === 'retail' ? 'retail' : 
                     selectedMetric === 'warehouse' ? 'warehouse' : 'total';
    
    const topSuppliers = supplierData
        .sort((a, b) => b[metricKey] - a[metricKey])
        .slice(0, 10);
    
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(topSuppliers, d => d[metricKey])])
        .range([0, width]);
    
    const yScale = d3.scaleBand()
        .domain(topSuppliers.map(d => d.supplier))
        .range([0, height])
        .padding(0.1);
    
    const bars = g.selectAll('.bar')
        .data(topSuppliers)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', d => yScale(d.supplier))
        .attr('width', 0)
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScheme[d.itemType.toLowerCase()])
        .on('mouseover', function(event, d) {
            showTooltip(event, `
                <strong>${d.fullSupplier}</strong><br/>
                Category: ${d.itemType}<br/>
                Retail: $${d3.format(',.0f')(d.retail)}<br/>
                Warehouse: $${d3.format(',.0f')(d.warehouse)}<br/>
                Total: $${d3.format(',.0f')(d.total)}
            `);
        })
        .on('mouseout', hideTooltip);
    
    bars.transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .attr('width', d => xScale(d[metricKey]));
    
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('.2s')));
    
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));
}

function nextSlide() {
    if (currentSlide < totalSlides) {
        document.getElementById(`slide-${currentSlide}`).classList.remove('active');
        currentSlide++;
        document.getElementById(`slide-${currentSlide}`).classList.add('active');
        updateNavigation();
    }
}

function previousSlide() {
    if (currentSlide > 1) {
        document.getElementById(`slide-${currentSlide}`).classList.remove('active');
        currentSlide--;
        document.getElementById(`slide-${currentSlide}`).classList.add('active');
        updateNavigation();
    }
}

function updateNavigation() {
    document.getElementById('prev-btn').disabled = currentSlide === 1;
    document.getElementById('next-btn').disabled = currentSlide === totalSlides;
    document.getElementById('slide-counter').textContent = `${currentSlide} of ${totalSlides}`;
}

function showTooltip(event, content) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = content;
    tooltip.style.opacity = '1';
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = '0';
}

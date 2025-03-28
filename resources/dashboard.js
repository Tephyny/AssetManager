if (typeof window !== 'undefined' && !window.ipcRenderer) {
  window.ipcRenderer = require('electron').ipcRenderer;
}

document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new Dashboard();
  dashboard.init();
});

class Dashboard {
  constructor() {
    this.assetChart = null;
  }

  async init() {
    await this.updateDashboard();
    // Set up event listeners for real-time updates
    window.ipcRenderer.on('assetUpdated', () => this.updateDashboard());

    // Set up the PDF export button
    const exportPdfButton = document.getElementById('exportPdfButton');
    if (exportPdfButton) {
      exportPdfButton.addEventListener('click', () => this.exportToPdf());
    }
  }

  async updateDashboard() {
    await this.updateAssetCounts();
    await this.updateAssetChart();
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount);
  }

  parsePrice(price) {
    if (price === undefined || price === null) {
      return 0;
    }
    if (typeof price === 'number') {
      return price;
    }
    if (typeof price === 'string') {
      return parseFloat(price.replace(/,/g, '')) || 0;
    }
    console.warn('Invalid price value:', price);
    return 0;
  }

  calculateTotalPrice(assets) {
    return assets.reduce((total, item) => {
      const price = this.parsePrice(item.total_price);
      const quantity = parseInt(item.total_quantity, 10) || 0;
      return total + (price * quantity);
    }, 0);
  }

  async updateAssetCounts() {
    try {
      const assetCounts = await window.ipcRenderer.invoke('getAssetCountsByStation');

      // Compute total asset count and price across all stations
      const totalCounts = { furniture: 0, vehicle: 0, office_equipment: 0, other: 0 };
      const totalPrices = { furniture: 0, vehicle: 0, office_equipment: 0, other: 0 };

      Object.keys(assetCounts).forEach(type => {
        assetCounts[type].forEach(item => {
          const quantity = parseInt(item.total_quantity, 10) || 0;
          const price = this.parsePrice(item.total_price);
          totalCounts[type] += quantity;
          totalPrices[type] += price * quantity; // Calculate total price for each type
        });
      });

      const totalAssets = Object.values(totalCounts).reduce((sum, count) => sum + count, 0);
      const totalPrice = Object.values(totalPrices).reduce((sum, price) => sum + price, 0);

      const assetCountsContainer = document.getElementById('assetCountsContainer');

      if (assetCountsContainer) {
        assetCountsContainer.innerHTML = `
          <div class="circle total-assets-count">Total Assets: ${totalAssets}</div>
          <div class="circle total-price">Total Price: ${this.formatCurrency(totalPrice)}</div>
          <div class="circle furniture-count">Furniture: ${totalCounts.furniture}</div>
          <div class="circle vehicle-count">Vehicles: ${totalCounts.vehicle}</div>
          <div class="circle office-equipment-count">Office Equipment: ${totalCounts.office_equipment}</div>
          <div class="circle other-count">Other Assets: ${totalCounts.other}</div>
        `;
      } else {
        console.error('Asset counts container element not found');
      }
    } catch (error) {
      console.error('Error in updateAssetCounts:', error);
    }
  }

  async updateAssetChart() {
    try {
      const assetCounts = await window.ipcRenderer.invoke('getAssetCountsByStation');

      // Get all unique stations across asset types
      const stations = [...new Set(
        Object.values(assetCounts).flatMap(typeData => typeData.map(item => item.station_name))
      )];

      const quantityDatasets = [
        { label: 'Furniture Quantity', backgroundColor: '#D1495B', stack: 'quantity', yAxisID: 'y' },
        { label: 'Vehicles Quantity', backgroundColor: '#30638E', stack: 'quantity', yAxisID: 'y' },
        { label: 'Office Equipment Quantity', backgroundColor: '#EDAE49', stack: 'quantity', yAxisID: 'y' },
        { label: 'Other Assets Quantity', backgroundColor: '#00798C', stack: 'quantity', yAxisID: 'y' }
      ];

      const priceDatasets = [
        { label: 'Furniture Price', backgroundColor: '#D1495B', stack: 'price', yAxisID: 'y1' },
        { label: 'Vehicles Price', backgroundColor: '#30638E', stack: 'price', yAxisID: 'y1' },
        { label: 'Office Equipment Price', backgroundColor: '#EDAE49', stack: 'price', yAxisID: 'y1' },
        { label: 'Other Assets Price', backgroundColor: '#00798C', stack: 'price', yAxisID: 'y1' }
      ];

      const assetTypes = ['furniture', 'vehicle', 'office_equipment', 'other'];

      assetTypes.forEach((type, index) => {
        quantityDatasets[index].data = stations.map(station => {
          const item = assetCounts[type].find(item => item.station_name === station);
          return item ? parseInt(item.total_quantity, 10) || 0 : 0;
        });
        priceDatasets[index].data = stations.map(station => {
          const item = assetCounts[type].find(item => item.station_name === station);
          if (item) {
            const price = this.parsePrice(item.total_price);
            const quantity = parseInt(item.total_quantity, 10) || 0;
            return price * quantity;
          }
          return 0;
        });
      });

      const datasets = [...quantityDatasets, ...priceDatasets];

      const chartElement = document.getElementById('assetChart');
      if (!chartElement) {
        console.error('Chart element not found');
        return;
      }

      // Calculate max values for quantity and price
      const maxQuantity = Math.max(...quantityDatasets.flatMap(dataset => dataset.data));
      const maxPrice = Math.max(...priceDatasets.flatMap(dataset => dataset.data));

      // Adjust y-axis for quantity (rounded to nearest 100)
      const quantityAxisMax = Math.ceil(maxQuantity / 100) * 100;
      const quantityStepSize = Math.ceil(quantityAxisMax / 10); // Dynamic step size for quantity axis

      // Adjust y1-axis for price (rounded to nearest 10,000,000)
      const priceAxisMax = Math.ceil(maxPrice / 10000000) * 10000000;
      const priceStepSize = Math.ceil(priceAxisMax / 10); // Dynamic step size for price axis

      if (this.assetChart) {
        this.assetChart.data.labels = stations;
        this.assetChart.data.datasets = datasets;
        this.assetChart.options.scales.y.max = quantityAxisMax;
        this.assetChart.options.scales.y1.max = priceAxisMax;
        this.assetChart.update();
      } else {
        this.assetChart = new Chart(chartElement, {
          type: 'bar',
          data: {
            labels: stations,
            datasets: datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true },
              y: { 
                type: 'linear',
                position: 'left',
                title: {
                  display: true,
                  text: 'Quantity'
                },
                stacked: true,
                min: 0,
                max: quantityAxisMax,
                ticks: {
                  stepSize: quantityStepSize, // Dynamic step size for quantity axis
                  callback: (value) => value.toLocaleString() // Format large numbers
                }
              },
              y1: {
                type: 'linear',
                position: 'right',
                title: {
                  display: true,
                  text: 'Price (TZS)'
                },
                stacked: true,
                min: 0,
                max: priceAxisMax, // Updated max value for price
                ticks: {
                  stepSize: priceStepSize, // Dynamic step size for price axis
                  callback: (value) => this.formatCurrency(value) // Format as currency
                },
                grid: {
                  drawOnChartArea: false
                }
              }
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context) => {
                    let label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.parsed.y !== null) {
                      label += context.dataset.yAxisID === 'y1' 
                        ? this.formatCurrency(context.parsed.y) // Format as currency for price
                        : context.parsed.y.toLocaleString(); // Format as number for quantity
                    }
                    return label;
                  }
                }
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error in updateAssetChart:', error);
    }
  }

  exportToPdf() {
    console.log('Export to PDF function called');
    const doc = new jsPDF();
    const totalPriceElement = document.querySelector('.total-price');
    const totalAssetsElement = document.querySelector('.total-assets-count');

    // Title
    doc.setFontSize(22);
    doc.text('UAS Asset Report', 14, 20);
    
    // Asset counts
    doc.setFontSize(16);
    doc.text(`Total Assets: ${totalAssetsElement ? totalAssetsElement.innerText : 'N/A'}`, 14, 40);
    doc.text(`Total Price: ${totalPriceElement ? totalPriceElement.innerText : 'N/A'}`, 14, 50);
    
    // Add chart as image
    const canvas = document.getElementById('assetChart');
    if (canvas) {
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 60, 180, 90);
    }

    // Save PDF
    doc.save('asset report.pdf');
  }
}

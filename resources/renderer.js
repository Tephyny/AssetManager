const { ipcRenderer } = require('electron');
const Toastify = require('toastify-js');
const { jsPDF } = window.jspdf;

// Common functions
const showToast = (message, type) => {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        style:{
            background: type === 'error' 
            ? "linear-gradient(to right, #ff5f6d, #ffc371)" 
            : "linear-gradient(to right, #00b09b, #96c93d)",
        },
    }).showToast();
};

// Global variable to store stations
let stationsMap = new Map();
let furnitureData = [];
let vehicleData = [];
let officeEquipmentData = [];
let otherData = [];


// Load stations function
async function loadStations() {
    try {
        const stations = await ipcRenderer.invoke('getStations');
        stationsMap = new Map(stations.map(station => [station.id.toString(), station.name]));
        populateStationDropdowns(stations);
    } catch (error) {
        console.error('Error loading stations:', error);
        showToast(`Error loading stations: ${error.message}`, 'error');
    }
}

// Populate station dropdowns
function populateStationDropdowns(stations) {
    const stationDropdowns = document.querySelectorAll('.station-dropdown');
    stationDropdowns.forEach(dropdown => {
        dropdown.innerHTML = '<option value="">Select a station</option>';
        stations.forEach(station => {
            const option = document.createElement('option');
            option.value = station.id;
            option.textContent = station.name;
            dropdown.appendChild(option);
        });
    });
}

// Asset strategies to manage different asset types
const assetStrategies = {
    furniture: {
        formId: 'furnitureForm',
        editFormId: 'editFurnitureForm',
        getMethod: 'getFurnitureById',
        saveMethod: 'saveFurniture',
        updateMethod: 'updateFurniture',
        loadMethod: 'getFurnitureWithStationName',
        fields: ['type', 'number', 'price','quantity', 'station_id', 'purchase_date', 'condition', 'employee_name'],
        listId: 'furnitureList',
        redirectPage: 'view-furniture.html',
        editPage: 'edit-furniture.html'
    },

    vehicle: {
        formId: 'vehicleForm',
        editFormId: 'editVehicleForm',
        getMethod: 'getVehicleById',
        saveMethod: 'saveVehicle',
        updateMethod: 'updateVehicle',
        loadMethod: 'getVehiclesWithStationNames',
        fields: ['type', 'name', 'number', 'price', 'quantity','station_id', 'purchase_date', 'condition', 'employee_name'],
        listId: 'vehicleList',
        redirectPage: 'view-vehicle.html',
        editPage: 'edit-vehicle.html'
    },

    office_equipment : {
        formId: 'officeEquipmentForm',
        editFormId: 'editEquipForm',
        getMethod: 'getOfficeEquipmentById',
        saveMethod: 'saveOfficeEquipment',
        updateMethod: 'updateOfficeEquipment',
        loadMethod: 'getOfficeEquipment',
        fields: ['type', 'name', 'number', 'price','quantity', 'station_id', 'purchase_date', 'condition', 'employee_name'],
        listId: 'equipmentList',
        redirectPage: 'view-equipment.html',
        editPage: 'edit-equip.html'
    },

    other : {
        formId: 'otherForm',
        editFormId: 'editOtherForm',
        getMethod: 'getOtherById',
        saveMethod: 'saveOther',
        updateMethod: 'updateOther',
        loadMethod: 'getOtherWithStationName',
        fields: ['name', 'number', 'price','quantity', 'station_id', 'purchase_date', 'condition', 'employee_name'],
        listId: 'otherList',
        redirectPage: 'view-assets.html',
        editPage: 'edit-assets.html'
    },

    // ... other asset strategies ...
};

// Load assets for different types
async function loadAssets(type) {
    const strategy = assetStrategies[type];
    try {
        const assets = await ipcRenderer.invoke(strategy.loadMethod);
        console.log(`Retrieved ${type} assets:`, assets);
        window[`${type}Data`] = assets; // Store the data globally
        displayAssets(type, assets);
        showToast(`Retrieved ${assets.length} ${type} items`, 'success');
    } catch (error) {
        showToast(`Error retrieving ${type} items: ${error.message}`, 'error');
    }
}

// Display assets in the list
function displayAssets(type, assets) {
    const listContainer = document.getElementById(assetStrategies[type].listId);
    if (!listContainer) return;

    let tableHtml = `
        <table>
            <thead>
                <tr>
                    ${assetStrategies[type].fields.map(field => `<th>${capitalizeFirstLetter(field.replace('_', ' '))}</th>`).join('')}
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    assets.forEach(asset => {
        tableHtml += `
            <tr>
                ${assetStrategies[type].fields.map(field => {
                    if (field === 'station_id') {
                        return `<td>${stationsMap.get(asset[field].toString()) || `Unknown Station (ID: ${asset[field]})`}</td>`;
                    } else if (field === 'price') {
                        return `<td>${formatCurrency(parsePrice(asset[field]))}</td>`;
                    }
                    return `<td>${asset[field]}</td>`;
                }).join('')}
                <td>
                   <button class="btn-edit" data-id="${asset.id}"><i class="fas fa-edit"></i></button>
                   <button class="btn-delete" data-id="${asset.id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    });
    
    tableHtml += '</tbody></table>';
    listContainer.innerHTML = tableHtml;

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editAsset(type, btn.dataset.id));
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteAsset(type, btn.dataset.id));
    });
}

async function loadAssetDataForEdit(type, assetId) {
    const strategy = assetStrategies[type];
    try {
        const asset = await ipcRenderer.invoke(strategy.getMethod, assetId);
        console.log(`Loaded asset data:`, asset); // Debug log
        strategy.fields.forEach(field => {
            const element = document.getElementById(`edit-${type}-${field}`);
            if (element) {
                if (field === 'station_id') {
                    element.value = asset[field];
                    // Update the displayed station name if you have a separate display element
                    const stationNameElement = document.getElementById(`edit-${type}-station-name`);
                    if (stationNameElement) {
                        stationNameElement.textContent = stationsMap.get(asset[field]) || 'Unknown Station';
                    }
                } else {
                    element.value = asset[field];
                }
                console.log(`Set ${field} to ${element.value}`); // Debug log
            } else {
                console.warn(`Element for field ${field} not found`); // Debug log
            }
        });
    } catch (error) {
        console.error('Error in loadAssetDataForEdit:', error); // Debug log
        showToast(`Error loading asset data: ${error.message}`, 'error');
    }
}


//editAsset function
async function editAsset(type, id) {
    const strategy = assetStrategies[type];
    window.location.href = `${strategy.editPage}?id=${id}`;
}

// Delete asset function
async function deleteAsset(type, id) {
    if (confirm('Are you sure you want to delete this asset?')) {
        try {
            await ipcRenderer.invoke(`delete${capitalizeFirstLetter(type)}`, id);
            showToast("Asset deleted successfully", 'success');
            loadAssets(type);
        } catch (error) {
            showToast(`Error deleting asset: ${error.message}`, 'error');
        }
    }
}

// Function to search assets
function searchAssets(type) {
    const searchInput = document.getElementById(`searchInput-${type}`);
    const searchColumn = document.getElementById(`searchColumn-${type}`);
    if (!searchInput || !searchColumn) return;

    const searchTerm = searchInput.value.toLowerCase();
    const column = searchColumn.value;

    const assets = window[`${type}Data`];
    if (!assets) return;

    const filteredAssets = assets.filter(item => {
        if (column === 'all') {
            return Object.values(item).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        } else {
            return String(item[column]).toLowerCase().includes(searchTerm);
        }
    });

    displayAssets(type, filteredAssets);
}

// Function to sort assets
function sortAssets(type) {
    const sortSelect = document.getElementById(`sortSelect-${type}`);
    const sortOrderBtn = document.getElementById(`sortOrderBtn-${type}`);
    if (!sortSelect || !sortOrderBtn) {
        console.error(`Sort elements not found for ${type}`);
        return;
    }

    const sortBy = sortSelect.value;
    const currentSortOrder = sortOrderBtn.dataset.order;

    const assets = window[`${type}Data`];
    if (!assets || !Array.isArray(assets)) {
        console.error(`No valid ${type} assets data available for sorting`);
        return;
    }

    assets.sort((a, b) => {
        let valueA = a[sortBy];
        let valueB = b[sortBy];
        
        if (sortBy === 'number') {
            // Split the asset number into parts
            const partsA = valueA.split('/');
            const partsB = valueB.split('/');
            
            // Compare each part of the asset number
            for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
                if (partsA[i] !== partsB[i]) {
                    // If parts are different, compare them
                    // If they're numeric, compare as numbers; otherwise, compare as strings
                    const numA = parseInt(partsA[i]);
                    const numB = parseInt(partsB[i]);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return currentSortOrder === 'asc' ? numA - numB : numB - numA;
                    } else {
                        return currentSortOrder === 'asc' 
                            ? partsA[i].localeCompare(partsB[i]) 
                            : partsB[i].localeCompare(partsA[i]);
                    }
                }
            }
            // If all parts are the same up to this point, compare by length
            return currentSortOrder === 'asc' 
                ? partsA.length - partsB.length 
                : partsB.length - partsA.length;
        } else if (sortBy === 'price') {
            valueA = parseFloat(valueA);
            valueB = parseFloat(valueB);
        }
        
        if (valueA < valueB) return currentSortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return currentSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    displayAssets(type, assets);
}

// Function to toggle sort order
function toggleSortOrder(type) {
    const sortOrderBtn = document.getElementById(`sortOrderBtn-${type}`);
    if (!sortOrderBtn) {
        console.error(`Sort order button not found for ${type}`);
        return;
    }

    sortOrderBtn.dataset.order = sortOrderBtn.dataset.order === 'asc' ? 'desc' : 'asc';
    sortOrderBtn.textContent = sortOrderBtn.dataset.order === 'asc' ? '↑' : '↓';
    sortAssets(type);
}

// Function to export to PDF
function exportToPdf(type) {
    console.log(`Export to PDF function called for ${type}`);
    const doc = new jsPDF();
    const assetTable = document.querySelector(`#${assetStrategies[type].listId} table`);
    
    if (!assetTable) {
        console.error(`${capitalizeFirstLetter(type)} Assets table not found in the DOM`);
        showToast(`Error: ${capitalizeFirstLetter(type)} Assets table not found`, 'error');
        return;
    }
    
    try {
        doc.autoTable({
            html: assetTable,
            columns: assetStrategies[type].fields.map(field => ({
                header: capitalizeFirstLetter(field.replace('_', ' ')),
                dataKey: field
            })),
            columnStyles: { 0: { cellWidth: 30 } },
            margin: { top: 10 },
            startY: 20,
            didDrawPage: (data) => {
                doc.setFontSize(12);
                doc.text('Page ' + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.height - 10);
            },
        });
        
        doc.setFontSize(16);
        doc.text(`UAS ${capitalizeFirstLetter(type)} List`, 14, 15);
        
        const inputModal = document.getElementById(`inputModal-${type}`);
        const savePdfBtn = document.getElementById(`savePdfBtn-${type}`);
        const cancelBtn = document.getElementById(`cancelBtn-${type}`);
        const pdfFileName = document.getElementById(`pdfFileName-${type}`);
        
        if (inputModal && savePdfBtn && cancelBtn && pdfFileName) {
            // If modal elements exist, use them
            inputModal.style.display = 'block';
            
            savePdfBtn.onclick = function () {
                const fileName = pdfFileName.value;
                savePDF(doc, fileName, type);
                inputModal.style.display = 'none';
            };
            
            cancelBtn.onclick = function () {
                console.log(`PDF export cancelled by user for ${type}`);
                inputModal.style.display = 'none';
            };
        } else {
            // If modal elements don't exist, use a default filename
            console.warn(`Modal elements not found for ${type}. Using default filename.`);
            const defaultFileName = `UAS ${capitalizeFirstLetter(type)} List.pdf`;
            savePDF(doc, defaultFileName, type);
        }
        
    } catch (error) {
        console.error(`Error generating PDF for ${type}:`, error);
        showToast(`Error generating PDF for ${type}: ${error.message}`, 'error');
    }
}

// Helper function to save PDF
function savePDF(doc, fileName, type) {
    if (fileName) {
        const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        doc.save(finalFileName);
        console.log(`PDF saved successfully for ${type}`);
        showToast(`PDF for ${capitalizeFirstLetter(type)} saved successfully`, 'success');
    } else {
        console.log(`PDF export cancelled for ${type}: No filename provided`);
        showToast(`PDF export cancelled: No filename provided`, 'error');
    }
}

// Helper function to capitalize the first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


// Initialize edit page
function initializeEditPage(type) {
    const editForm = document.getElementById(assetStrategies[type].editFormId);
    if (editForm) {
        const assetId = new URLSearchParams(window.location.search).get('id');
        if (assetId) {
            loadAssetDataForEdit(type, assetId);
        } else {
            console.warn('No asset ID provided for editing'); // Debug log
        }

        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const assetData = {};
            assetStrategies[type].fields.forEach(field => {
                const element = document.getElementById(`edit-${type}-${field}`);
                if (element) {
                    assetData[field] = element.value;
                } else {
                    console.warn(`Element for field ${field} not found during form submission`); // Debug log
                }
            });
            try {
                await ipcRenderer.invoke(assetStrategies[type].updateMethod, assetId, assetData);
                showToast(`${capitalizeFirstLetter(type)} updated successfully`, 'success');
                window.location.href = assetStrategies[type].redirectPage;
            } catch (error) {
                console.error('Error updating asset:', error); // Debug log
                showToast(`Error updating ${type}: ${error.message}`, 'error');
            }
        });
    } else {
        console.warn(`Edit form for ${type} not found`); // Debug log
    }
}


// New functions for pricing calculations and display

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount);
}

function parsePrice(price) {
    // If price is already a number, return it
    if (typeof price === 'number') {
        return price;
    }
    // If it's a string, remove commas and convert to float
    if (typeof price === 'string') {
        return parseFloat(price.replace(/,/g, ''));
    }
    // If it's neither a number nor a string, return 0 or handle the error as appropriate
    console.error('Invalid price value:', price);
    return 0;
}

function calculateTotalPrice(assets) {
    return assets.reduce((total, item) => {
        const price = parsePrice(item.price);
        const quantity = item.quantity ? parseFloat(item.quantity) : 1;
        return total + (price * quantity);
    }, 0);
}

function groupBy(array, key) {
    return array.reduce((result, item) => {
        (result[item[key]] = result[item[key]] || []).push(item);
        return result;
    }, {});
}

function displayTotalPrice(type, totalPrice, breakdowns = null) {
    const resultDiv = document.getElementById(`totalPriceResult-${type}`);
    let html = `<h3>Total Price: ${formatCurrency(totalPrice)}</h3>`;

    if (breakdowns) {
        html += '<ul>';
        for (const [key, value] of Object.entries(breakdowns)) {
            html += `<li>${key}: ${formatCurrency(value)}</li>`;
        }
        html += '</ul>';
    }

    resultDiv.innerHTML = html;
}

function showTotalPriceModal(type) {
    const modal = document.getElementById(`totalPriceModal-${type}`);
    modal.style.display = 'block';

    // Close modal when clicking on X
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';

    // Close modal when clicking outside of it
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

        // Set up event listeners for price calculations
    document.getElementById(`totalPriceAll-${type}`).onclick = () => calculateAndDisplayTotal(type);
    document.getElementById(`totalPriceByStation-${type}`).onclick = () => calculateAndDisplayTotalByStation(type);
    document.getElementById(`totalPriceByCondition-${type}`).onclick = () => calculateAndDisplayTotalByCondition(type);
}
    
    function calculateAndDisplayTotal(type) {
        const assets = window[`${type}Data`];
        const totalPrice = calculateTotalPrice(assets);
        displayTotalPrice(type, totalPrice);
    }
    
    function calculateAndDisplayTotalByStation(type) {
        const assets = window[`${type}Data`];
        const groupedByStation = groupBy(assets, 'station_id');
        const breakdowns = {};
        let totalPrice = 0;
    
        for (const [stationId, stationAssets] of Object.entries(groupedByStation)) {
            const stationTotal = calculateTotalPrice(stationAssets);
            breakdowns[stationsMap.get(stationId) || 'Unknown Station'] = stationTotal;
            totalPrice += stationTotal;
        }
    
        displayTotalPrice(type, totalPrice, breakdowns);
    }
    
    function calculateAndDisplayTotalByCondition(type) {
        const assets = window[`${type}Data`];
        const groupedByCondition = groupBy(assets, 'condition');
        const breakdowns = {};
        let totalPrice = 0;
    
        for (const [condition, conditionAssets] of Object.entries(groupedByCondition)) {
            const conditionTotal = calculateTotalPrice(conditionAssets);
            breakdowns[condition] = conditionTotal;
            totalPrice += conditionTotal;
        }
    
        displayTotalPrice(type, totalPrice, breakdowns);
    }

// Initialize forms and event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    loadStations().then(() => {
        console.log('Stations loaded');

        const currentPage = window.location.pathname.split('/').pop();
        console.log('Current page:', currentPage);

        Object.keys(assetStrategies).forEach(type => {
            if (currentPage === assetStrategies[type].editPage) {
                console.log(`Initializing edit page for ${type}`);
                initializeEditPage(type);
            } else if (currentPage === assetStrategies[type].redirectPage) {
                console.log(`Loading assets for ${type}`);
                loadAssets(type);
            }

            const form = document.getElementById(assetStrategies[type].formId);
            if (form) {
                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    const assetData = {};
                    assetStrategies[type].fields.forEach(field => {
                        let value = document.getElementById(`${type}-${field}`).value;
                        if (field === 'price') {
                            value = parsePrice(value).toString(); // Convert back to string for consistency
                        }
                        assetData[field] = value;
                    });
                    try {
                        const id = await ipcRenderer.invoke(assetStrategies[type].saveMethod, assetData);
                        showToast(`${capitalizeFirstLetter(type)} saved with ID: ${id}`, 'success');
                        form.reset();
                    } catch (error) {
                        showToast(`Error saving ${type}: ${error.message}`, 'error');
                    }
                });
            }

            const viewBtn = document.getElementById(`view${capitalizeFirstLetter(type)}Btn`);
            if (viewBtn) {
                viewBtn.addEventListener('click', () => loadAssets(type));
            }

            const exportPdfBtn = document.getElementById(`exportPdfBtn-${type}`);
            if (exportPdfBtn) {
                exportPdfBtn.addEventListener('click', () => exportToPdf(type));
            }

            const searchInput = document.getElementById(`searchInput-${type}`);
            const searchColumn = document.getElementById(`searchColumn-${type}`);
            const sortSelect = document.getElementById(`sortSelect-${type}`);
            const sortOrderBtn = document.getElementById(`sortOrderBtn-${type}`);

            if (searchInput && searchColumn) {
                searchInput.addEventListener('input', () => searchAssets(type));
                searchColumn.addEventListener('change', () => searchAssets(type));
            }

            if (sortSelect) {
                sortSelect.addEventListener('change', () => sortAssets(type));
            }

            if (sortOrderBtn) {
                sortOrderBtn.addEventListener('click', () => toggleSortOrder(type));
                sortOrderBtn.dataset.order = 'asc'; // Initialize sort order
            }
           

            const showTotalPriceBtn = document.getElementById(`showTotalPriceBtn-${type}`);
            if (showTotalPriceBtn) {
                showTotalPriceBtn.addEventListener('click', () => showTotalPriceModal(type));
            }
              
                });
            }
)});


    // Station form handling
    const stationForm = document.getElementById('stationForm');
    if (stationForm) {
        stationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
    
            const stationData = {
                name: document.getElementById('station-name').value,
                location: document.getElementById('station-location').value,
            };
    
            try {
                const id = await ipcRenderer.invoke('saveStation', stationData);
                showToast(`Station saved with ID: ${id}`, 'success');
                stationForm.reset();
                loadStations(); // Refresh the station list
            } catch (error) {
                showToast(`Error saving station: ${error.message}`, 'error');
            }
        });
    }

module.exports = {
    loadAssets,
    displayAssets,
    editAsset,
    deleteAsset,
    exportToPdf,
    loadStations
};
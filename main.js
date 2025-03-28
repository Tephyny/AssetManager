const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: path.join('database.sqlite')

    // filename: path.join(app.getPath('userData'), 'database.sqlite')
    
  },
  useNullAsDefault: true
});

let mainWindow;


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 2000,
    height: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('resources/index.html');
}

app.whenReady().then(() => {
  createWindow();
  setupDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

//Furniture Table


  async function setupDatabase() {

    if (!(await knex.schema.hasTable('stations'))) {
      await knex.schema.createTable('stations', (table) => {
        table.increments('id').primary();
        table.string('name').unique();
        table.string('location');
      });
    }
  
    if (!(await knex.schema.hasTable('furniture'))) {
      await knex.schema.createTable('furniture', (table) => {
        table.increments('id').primary();
        table.string('type');
        table.string('number');
        table.decimal('price', 15,1);
        table.integer('quantity');
        table.date('purchase_date');
        table.string('condition');
        table.string('employee_name');
        table.integer('station_id').unsigned().references('id').inTable('stations');
      });
    }
  
    if (!(await knex.schema.hasTable('vehicle'))) {
      await knex.schema.createTable('vehicle', (table) => {
        table.increments('id').primary();
        table.string('type');
        table.string('name');
        table.integer('number');
        table.decimal('price', 15,1);
        table.integer('quantity');
        table.date('purchase_date');
        table.string('condition');
        table.string('employee_name');
        table.integer('station_id').unsigned().references('id').inTable('stations');
      });
    }
  
    if (!(await knex.schema.hasTable('office_equipment'))) {
      await knex.schema.createTable('office_equipment', (table) => {
        table.increments('id').primary();
        table.string('type');
        table.string('name');
        table.string('number');
        table.decimal('price', 15,1);
        table.integer('quantity');
        table.date('purchase_date');
        table.string('condition');
        table.string('employee_name');
        table.integer('station_id').unsigned().references('id').inTable('stations');
      });
    }
  

  if (!(await knex.schema.hasTable('other'))) {
    await knex.schema.createTable('other', (table) => {
      table.increments('id').primary();
      table.string('name');
      table.string('number');
      table.decimal('price', 15,1);
      table.integer('quantity');
      table.date('purchase_date');
      table.string('condition');
      table.string('employee_name');
      table.integer('station_id').unsigned().references('id').inTable('stations');
    });
  }
};
  


// Furniture handlers
ipcMain.handle('saveFurniture', async (event, furnitureData) => {
  try {
    const [id] = await knex('furniture').insert(furnitureData);
    return id;
  } catch (error) {
    console.error('Error saving furniture:', error);
    throw error;
  }
});



ipcMain.handle('getFurnitureById', async (event, id) => {
  try {
    const furniture = await knex('furniture').where({ id }).first();
    return furniture;
  } catch (error) {
    console.error('Error retrieving furniture:', error);
    throw error;
  }
});

ipcMain.handle('getFurnitureWithStationName', async () => {
  try {
    console.log('Attempting to fetch furniture with station names...');
    
    // Check if tables exist
    const furnitureExists = await knex.schema.hasTable('furniture');
    const stationsExists = await knex.schema.hasTable('stations');
    
    if (!furnitureExists || !stationsExists) {
      throw new Error(`Tables missing: furniture (${furnitureExists}), stations (${stationsExists})`);
    }

    const result = await knex('furniture')
      .select(
        'furniture.*',
        'stations.name as station_name'
      )
      .leftJoin('stations', 'furniture.station_id', 'stations.id');
    
    console.log(`Query successful. Retrieved ${result.length} rows.`);
    
    return result;
  } catch (error) {
    console.error('Error getting furniture with station names:', error);
    throw error;
  }
});

ipcMain.handle('updateFurniture', async (event, id, updatedData) => {
  try {
    await knex('furniture').where({ id }).update(updatedData);
    return true;
  } catch (error) {
    console.error('Error updating furniture:', error);
    throw error;
  }
});

ipcMain.handle('deleteFurniture', async (event, id) => {
  try {
    await knex('furniture').where({ id }).del();
    return true;
  } catch (error) {
    console.error('Error deleting furniture:', error);
    throw error;
  }
});




// Vehicle handlers
ipcMain.handle('saveVehicle', async (event, vehicleData) => {
  try {
    const [id] = await knex('vehicle').insert(vehicleData);
    return id;
  } catch (error) {
    console.error('Error saving vehicle:', error);
    throw error;
  }
});

ipcMain.handle('getVehicle', async () => {
  try {
    const result = await knex('vehicle')
      .select(
        'vehicle.*',
        'stations.name as station_name'
      )
      .leftJoin('stations', 'vehicle.station_id', 'stations.id');
    
    return result;
  } catch (error) {
    console.error('Error getting vehicle with station names:', error);
    throw error;
  }
});

ipcMain.handle('getVehiclesWithStationNames', async () => {
  try {
    console.log('Attempting to fetch vehicles with station names...');
    
    // Check if tables exist
    const vehicleExists = await knex.schema.hasTable('vehicle');
    const stationsExists = await knex.schema.hasTable('stations');
    
    if (!vehicleExists || !stationsExists) {
      throw new Error(`Tables missing: vehicle (${vehicleExists}), stations (${stationsExists})`);
    }

    const result = await knex('vehicle')
      .select(
        'vehicle.*',
        'stations.name as station_name'
      )
      .leftJoin('stations', 'vehicle.station_id', 'stations.id')
      .orderBy('vehicle.id', 'asc'); // Add sorting if needed
    
    console.log(`Query successful. Retrieved ${result.length} vehicles.`);
    
    return result;
  } catch (error) {
    console.error('Error getting vehicles with station names:', error);
    throw error;
  }
});


ipcMain.handle('getVehicleById', async (event, id) => {
  try {
    const vehicle = await knex('vehicle').where({ id }).first();
    return vehicle;
  } catch (error) {
    console.error('Error retrieving vehicle:', error);
    throw error;
  }
});

ipcMain.handle('updateVehicle', async (event, id, updatedData) => {
  try {
    await knex('vehicle').where({ id }).update(updatedData);
    return true;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
});

ipcMain.handle('deleteVehicle', async (event, id) => {
  try {
    await knex('vehicle').where({ id }).del();
    return true;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
});

// Office Equipment handlers
ipcMain.handle('saveOfficeEquipment', async (event, officeEquipmentData) => {
  try {
    const [id] = await knex('office_equipment').insert(officeEquipmentData);
    return id;
  } catch (error) {
    console.error('Error saving office equipment:', error);
    throw error;
  }
});

ipcMain.handle('getOfficeEquipment', async () => {
  try {
    console.log('Attempting to fetch office equipment with station names...');
    
    // Check if tables exist
    const office_equipmentExists = await knex.schema.hasTable('office_equipment');
    const stationsExists = await knex.schema.hasTable('stations');
    
    if (!office_equipmentExists || !stationsExists) {
      throw new Error(`Tables missing: office_equipment (${office_equipmentExists}), stations (${stationsExists})`);
    }

    const result = await knex('office_equipment')
      .select(
        'office_equipment.*',
        'stations.name as station_name'
      )
      .leftJoin('stations', 'office_equipment.station_id', 'stations.id')
    
    console.log(`Query successful. Retrieved ${result.length} office_equipment.`);
    
    return result;
  } catch (error) {
    console.error('Error getting office equipment with station names:', error);
    throw error;
  }
});

ipcMain.handle('getOfficeEquipmentById', async (event, id) => {
  try {
    const officeEquipment = await knex('office_equipment').where({ id }).first();
    return officeEquipment;
  } catch (error) {
    console.error('Error retrieving office equipment:', error);
    throw error;
  }
});

ipcMain.handle('updateOfficeEquipment', async (event, id, updatedData) => {
  try {
    await knex('office_equipment').where({ id }).update(updatedData);
    return true;
  } catch (error) {
    console.error('Error updating office equipment:', error);
    throw error;
  }
});

ipcMain.handle('deleteOfficeEquipment', async (event, id) => {
  try {
    await knex('office_equipment').where({ id }).del();
    return true;
  } catch (error) {
    console.error('Error deleting office equipment:', error);
    throw error;
  }
});

// Other Assets handlers
ipcMain.handle('saveOther', async (event, otherData) => {
  try {
    const [id] = await knex('other').insert(otherData);
    return id;
  } catch (error) {
    console.error('Error saving otherAsset:', error);
    throw error;
  }
});



ipcMain.handle('getOtherById', async (event, id) => {
  try {
    const other = await knex('other').where({ id }).first();
    return other;
  } catch (error) {
    console.error('Error retrieving otherAsset:', error);
    throw error;
  }
});

ipcMain.handle('getOtherWithStationName', async () => {
  try {
    console.log('Attempting to fetch other Assets with station names...');
    
    // Check if tables exist
    const otherExists = await knex.schema.hasTable('other');
    const stationsExists = await knex.schema.hasTable('stations');
    
    if (!otherExists || !stationsExists) {
      throw new Error(`Tables missing: other (${otherExists}), stations (${stationsExists})`);
    }

    const result = await knex('other')
      .select(
        'other.*',
        'stations.name as station_name'
      )
      .leftJoin('stations', 'other.station_id', 'stations.id');
    
    console.log(`Query successful. Retrieved ${result.length} rows.`);
    
    return result;
  } catch (error) {
    console.error('Error getting furniture with station names:', error);
    throw error;
  }
});

ipcMain.handle('updateOther', async (event, id, updatedData) => {
  try {
    await knex('other').where({ id }).update(updatedData);
    return true;
  } catch (error) {
    console.error('Error updating otherAssets:', error);
    throw error;
  }
});

ipcMain.handle('deleteOther', async (event, id) => {
  try {
    await knex('other').where({ id }).del();
    return true;
  } catch (error) {
    console.error('Error deleting otherAssets:', error);
    throw error;
  }
});

//Station Handlers

ipcMain.handle('saveStation', async (event, stationData) => {
  try {
    const [id] = await knex('stations').insert(stationData);
    return id;
  } catch (error) {
    console.error('Error saving station:', error);
    throw error;
  }
});

ipcMain.handle('getStations', async () => {
  try {
    return await knex('stations').select('*');
  } catch (error) {
    console.error('Error retrieving stations:', error);
    throw error;
  }
});

ipcMain.handle('getStationsById', async (event, id) => {
  try {
    const stations = await knex('stations').where({ id }).first();
    return stations;
  } catch (error) {
    console.error('Error retrieving office equipment:', error);
    throw error;
  }
});

async function getAssetCountsByStation() {
  try {
    // Function to get counts and total price for a specific asset type
    const getCountsAndPriceByAssetType = async (tableName) => {
      return knex(tableName)
        .select('stations.name as station_name')
        .sum(`${tableName}.quantity as total_quantity`) // Corrected use of template literal
        .sum(`${tableName}.price as total_price`) // Corrected use of template literal
        .leftJoin('stations', `${tableName}.station_id`, 'stations.id') // Corrected use of template literal
        .groupBy('stations.name');
    };
    

    // Get counts and prices for all asset types
    const [furnitureData, vehicleData, officeEquipmentData, otherData] = await Promise.all([
      getCountsAndPriceByAssetType('furniture'),
      getCountsAndPriceByAssetType('vehicle'),
      getCountsAndPriceByAssetType('office_equipment'),
      getCountsAndPriceByAssetType('other')
    ]);

    // Combine results
    return {
      furniture: furnitureData,
      vehicle: vehicleData,
      office_equipment: officeEquipmentData,
      other: otherData,
    };
  } catch (error) {
    console.error('Error getting asset counts and prices by station:', error);
    throw error;
  }
}


// Register the IPC handler for getAssetCountsByStation
ipcMain.handle('getAssetCountsByStation', async (event) => {
  try {
    const assetData = await getAssetCountsByStation();
    return assetData;
  } catch (error) {
    console.error('Error in getAssetCountsByStation handler:', error);
    throw error; // This will be sent back to the renderer process as a rejected promise
  }
});

// Function to log asset counts (for testing or monitoring purposes)
async function logAssetCounts() {
  try {
    const assetCountsByStation = await getAssetCountsByStation();
    console.log('Asset counts by station:', JSON.stringify(assetCountsByStation, null, 2));
  } catch (error) {
    console.error('Error fetching asset counts:', error);
  }
}

// You can call this function to log asset counts when needed
// logAssetCounts();

module.exports = { getAssetCountsByStation, logAssetCounts };
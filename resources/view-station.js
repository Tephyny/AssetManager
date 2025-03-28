if (!window.ipcRenderer) {
    window.ipcRenderer = require('electron').ipcRenderer;
}
const Toastify = require('toastify-js');

document.addEventListener('DOMContentLoaded', () => {
    const assetList = document.getElementById('stationList');

    async function loadAssets() {
        try {
            const stations = await ipcRenderer.invoke('getStations');
            
            let tableHtml = `
                <table>
                    <tr>
                        <th>Name</th>
                        <th>Location</th>
                    
                    </tr>
            `;
            
            stations.forEach(item => {
                tableHtml += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.location}</td>
  
                    </tr>
                `;
            });
            
            tableHtml += '</table>';
            assetList.innerHTML = tableHtml;

            // Add event listeners for edit and delete buttons
            
        } catch (error) {
            Toastify({
                text: `Error retrieving assets: ${error.message}`,
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
            }).showToast();
        }
    }

     

   

    loadAssets();
});
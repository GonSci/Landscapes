# Location Test Data

This list contains the initial set of locations along with their detailed metadata. You can use this data to test adding new locations, editing existing ones, or confirming the values currently in your database via the Admin Dashboard.

| Name | District | Latitude, Longitude | Video Filename | Type | FOV Area (m²) | Environment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baguio Night Market** | Harrison Rd | 16.412636, 120.594865 | `night_market.mp4` | Shopping & Retail | 198.14 | Outdoor |
| **Wright Park** | Leonard Wood | 16.415751, 120.617223 | `wright.mp4` | Nature & Outdoors | 539.63 | Outdoor |
| **The Mansion** | Leonard Wood | 16.412562, 120.621426 | `mansion_entrance.mp4` | Museums & Arts | 131.06 | Outdoor |
| **Baguio Cathedral** | Session Rd | 16.412685, 120.598667 | `cathedral.mp4` | Museums & Arts | 457.50 | Indoor |
| **Melvin Jones Burnham Park** | Burnham Park | 16.411978, 120.595911 | `burnham.mp4` | Nature & Outdoors | 1481.79 | Outdoor |
| **Mt. Cloud Bookshop** | Asin Rd | 16.415853, 120.608534 | `mt_cloud_bookshop.mp4` | Shopping & Retail | *None* | Indoor |
| **Ili-Likha Arts & Village** | Chuntug Rd | 16.413853, 120.597429 | `ili_likha_arts.mp4` | Museums & Arts | *None* | Indoor |
| **Cafe by the Ruins** | Chuntug Rd | 16.412952, 120.591639 | `cafe_ruins.mp4` | Dining & Food | *None* | Indoor |
| **Gypsy Baguio by Chef Waya** | Upper Gen. Luna | 16.413264, 120.582587 | `gypsy_baguio.mp4` | Dining & Food | *None* | Indoor |
| **Baguio Orchidarium** | Leonard Wood | 16.410979, 120.592425 | `orchidarium.mp4` | Nature & Outdoors | *None* | Outdoor |
| **Heritage Hill** | Bokawkan Rd | 16.403957, 120.586658 | `heritage_hill.mp4` | Museums & Arts | *None* | Indoor |

---

### Tips for Testing CRUD Operations:
1. **Create**: Try adding a brand new location (e.g., "Session Road") and leave the FOV area empty to see how the system handles the fallback calculation.
2. **Read/Filter**: Use the search bar to find "Baguio" and ensure only those specific locations show up. Use the Dropdown to view only "Indoor" or "Outdoor" environments if you decide to implement that filter later.
3. **Update**: Pick one of the locations with an empty FOV Area (like *Mt. Cloud Bookshop*) and edit it to include an FOV Area, then check if it updates properly.
4. **Delete**: Delete one of the locations to ensure it is properly removed from the view and your backend database.

# IFPRI--Calculate-Productive-Agriculture
*Scripts Aggregates Cleared Forest and Cropland datasets, masking slope > 15%, permanent water, and imprevious surfaces to identify arable land in country of interest at 30m resolution.*
	          
	  Directions for Downloading GFSAD Data:
	    1. Go to https://search.earthdata.nasa.gov/search. If you're a new user, create a login using contact information.
	    2. Search "GFSAD" in the top left search bar "Search for collections and topics"
	    3. Select "Global Food Security-support Analysis Data (GFSAD) Cropland Extent 2015 Africa 30 m V001"
	    4. In the map area to the right, image footprints will appear as on overlay over Africa. Navigate to country of interest, select image footprint that you would like to download. In the left side table showing search results, the image you have selected will be outlined in green (NOTE: This may require scrolling through the image list).
	    5. In the green outlined box, click "Download Granule" to download the scene to the desired output location on your computer.
	    6. Repeat these steps until you have downloaded all images required to cover your entire area of interest.
            7. Upload download GFSAD geoTIFFs to GEE from Assets and import them into calcArableLand script.![image](https://user-images.githubusercontent.com/54441886/206823358-5993aad6-ae09-40d6-a33f-b14dd4f04bc7.png)

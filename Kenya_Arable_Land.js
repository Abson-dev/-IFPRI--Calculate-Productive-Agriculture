var GFSAD1000 = ee.Image("USGS/GFSAD1000_V1"),
    GAUL_adm0 = ee.FeatureCollection("FAO/GAUL/2015/level0"),
    GAUL_adm2 = ee.FeatureCollection("FAO/GAUL/2015/level2"),
    Hansen_GFC = ee.Image("UMD/hansen/global_forest_change_2020_v1_8"),
    SRTM = ee.Image("USGS/SRTMGL1_003"),
    surfaceWater = ee.Image("JRC/GSW1_3/GlobalSurfaceWater"),
    imperviousSurface = ee.Image("Tsinghua/FROM-GLC/GAIA/v10"),
    GFSAD30AFCE_2015_KEN_3 = ee.Image("projects/ee-aboubacarhema94/assets/GFSAD30AFCE_2015_KEN_3"),
    GFSAD30AFCE_2015_KEN_4 = ee.Image("projects/ee-aboubacarhema94/assets/GFSAD30AFCE_2015_KEN_4"),
    GFSAD30AFCE_2015_KEN_1 = ee.Image("projects/ee-aboubacarhema94/assets/GFSAD30AFCE_2015_KEN_1"),
    GFSAD30AFCE_2015_KEN_2 = ee.Image("projects/ee-aboubacarhema94/assets/GFSAD30AFCE_2015_KEN_2");

    ////////////////////////////////////////////////////
//IFPRI- Calculate Productive Agriculture  
//December 2022
// 
//Description: Scripts Aggregates Cleared Forest and Cropland datasets, masking slope > 15%, permanent water,
          // and imprevious surfaces to identify arable land in Burundi at 30m resolution
////////////////////////////////////////////////////

//Variables 

var adm0_name = "Kenya"; 
var deforestCompYear = 15; //Last two digits of year only

//Downloaded from EarthExplorer over Burkina Faso
  //Download URL: https://search.earthdata.nasa.gov/search
  //Dataset URL: https://lpdaac.usgs.gov/products/gfsad30afcev001/
var GFSAD_1 = GFSAD30AFCE_2015_KEN_1;
var GFSAD_2 = GFSAD30AFCE_2015_KEN_2;
var GFSAD_3 = GFSAD30AFCE_2015_KEN_3;
var GFSAD_4 = GFSAD30AFCE_2015_KEN_4;
//////////////////////////////////////////////////////////////////
//Get AOI of Interest

////Import FAO GAUL 2015 Dataset Adm0 and ADM2 Boundaries and Filter for Burundi
var adm0_AOI = GAUL_adm0.filterMetadata("ADM0_NAME", "equals", adm0_name);
var adm2_AOI = GAUL_adm2.filterMetadata("ADM0_NAME", "equals", adm0_name);

Map.addLayer(adm0_AOI);
Map.addLayer(adm2_AOI);

////////////////////////////////////////////////////////////////
//Imported GFSAD30AFCE Rasters --> 30m 

//CLip Images to Burkina Extent --> Mask 
var clipGFSAD_1 = GFSAD_1.clip(adm0_AOI);
var clipGFSAD_2 = GFSAD_2.clip(adm0_AOI);
var clipGFSAD_3 = GFSAD_3.clip(adm0_AOI);
var clipGFSAD_4 = GFSAD_4.clip(adm0_AOI);

//Create Image Collection so it can be mosaiced together --> use quality mosaic to get highest 
var aoi_ALL_LC = ee.ImageCollection.fromImages([clipGFSAD_1, clipGFSAD_2, clipGFSAD_3, clipGFSAD_4]).qualityMosaic('b1');


//Mask to select Cropland (band b1)
var aoiCroplandMask = aoi_ALL_LC.select("b1").eq(2);

//Mask Image so that only 2 = CropLand Displays
var aoiCropland = aoi_ALL_LC.mask(aoiCroplandMask);


//Check Pixel Area

var cropMaskVis3 = {
  min: 0.0,
  max: 2.0,
  palette: ['black', 'orange', 'green'],
};

//Map.addLayer(aoiCropland, cropMaskVis3, adm0_name + ' Crop Mask');


////////////////////////////////////////////////////////////////
//Filter Hansen Dataset for cleared forested between 2000 and 2015

var aoi_ALL_CF = Hansen_GFC.clipToCollection(adm0_AOI);

//Create Mask, selecting "loss year layer" less than or equal to 2015
var aoiClearForestMask = aoi_ALL_CF.select("lossyear").lte(15);

//Mask Collection for only forests cleared between 2000 and 2015
var aoiClearedForest = aoi_ALL_CF.mask(aoiClearForestMask);

var treeLossVisParam = {
  bands: ['lossyear'],
  min: 0,
  max: 15,
  palette: ['yellow', 'red']
};

//Map.addLayer(aoiClearedForest, treeLossVisParam, adm0_name + ' Forest Clearance Year');
//print(aoiClearedForest)

/////////////////////////////////////////////////////////////////
//Create Images to Mask Slope, Water, Urban

//Slope--> 
  //Dataset Used: https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003
  
  //Calculate Slope for SRTM Dataset and Clip to AOI Extent
var slope = ee.Terrain.slope(SRTM).clip(adm0_AOI);
  
  //Create Mask that will select for slope w/gradient less than 15%
var flatLandMask = slope.select('slope').lte(15);
  
  //Mask Terrain
var agTerrain = slope.mask(flatLandMask);

 // Map.addLayer(agTerrain, {min: 0, max: 60}, 'Flat Land');

//Water --> 
  //Dataset used --> https://developers.google.com/earth-engine/datasets/catalog/JRC_GSW1_3_GlobalSurfaceWater#bands

  //Clip JRC Image to Aoi and select "occurance" band and unmask image so that nonwater pixels are 0
var allWaterAOI = surfaceWater.select('occurrence').unmask(0).clip(adm0_AOI);

var waterViz = {
  bands: ['occurrence'],
  min: 0.0,
  max: 100.0,
  palette: ['ffffff', 'ffbbbb', '0000ff']
};

//Map.addLayer(allWaterAOI, waterViz, adm0_name + ' Water Occurance');

//Impervious Surface
 //Clip Impervious Surface to AOI Extent
var impSurfaceAOI = imperviousSurface.unmask(0).clip(adm0_AOI);
  
  var visualization = {
  bands: ['change_year_index'],
  min: 0.0,
  max: 34.0,
  palette: [
    "014352","1A492C","071EC4","B5CA36","729EAC","8EA5DE",
    "818991","62A3C3","CCF4FE","74F0B9","32BC55","C72144",
    "56613B","C14683","C31C25","5F6253","11BF85","A61B26",
    "99FBC5","188AAA","C2D7F1","B7D9D8","856F96","109C6B",
    "2DE3F4","9A777D","151796","C033D8","510037","640C21",
    "31A191","223AB0","B692AC","2DE3F4",
  ]
};


//Map.addLayer(impSurfaceAOI, visualization, adm0_name + ' Impervious Surface');


///////////////////////////////////////////////////////////////////////
//Create Arable Land Image

//Unmask Bands Setting values to zero
var arableFromCropland = aoiCropland.select('b1').unmask(0);
var arableClearedForest = aoiClearedForest.select("lossyear").unmask(0);

//Add Unmasked Image bands together to create arable land image
var calcArableLandAOI = arableFromCropland.select('b1').add(arableClearedForest.select("lossyear"))
                .rename('arableLand')
                .clip(adm0_AOI);


//Concatenate Arable Land, Slope, Water, Impervious Suface
var combinedImage = ee.Image.cat([calcArableLandAOI, slope, allWaterAOI, impSurfaceAOI]); 

//MASK out not arable land, slope gte 15%, permanent water, and impervious surfaces
  //Mask Selecting Non-Zeros --> not arable land 
var arableLandMask = combinedImage.select("arableLand").gt(0);
  //Apply Mask
var maskedNonArable = combinedImage.mask(arableLandMask);
  
  //Create Mask selecting water occuring less than 10% of the time
var permWaterMask = maskedNonArable.select('occurrence').lt(10);
  //ApplyMask
var maskedpermWater = maskedNonArable.updateMask(permWaterMask);
  
  //Create Mask Eliminating Impermeable Surfaces (not equal to 0) so select 0
var impermeableSurfaceMask = maskedpermWater.select('change_year_index').eq(0);
  //ApplyMask
var arableLand = maskedpermWater.updateMask(impermeableSurfaceMask);

var arableLandVis = {
  bands: ['arableLand'],
  min: 1,
  max: 16,
  palette: ["90ee90", " #013220"]
};

Map.addLayer(arableLand, arableLandVis, adm0_name + ' Arable Land');
Map.setCenter(35,1,6)

//Export GeoTIFF of Arable Land 

Export.image.toDrive({
  image: arableLand.select("arableLand"),
  folder: "", //set based on user preference
  description: adm0_name + " arableLand",
  fileNamePrefix: adm0_name + " arableLand",
  scale: 30,
  maxPixels: 10000000000000, //just in case it tops out
  fileFormat: "GeoTIFF"
});


//--------------------------Calculate Land Area by Region----------------------------------------//

//Caculate Pixel area per arable land pixel
//Select arable land band from arableLand Image
var areaImage = arableLand.select('arableLand')
        //Calculate pixel area --> calculates meters^2
        .multiply(ee.Image.pixelArea())
        //Convert to hectares and rename 
        .multiply(0.0001).rename('areaHectares')
        //Convert data type from float to integer
        .toInt();


//Create a function to calculate the feature class with ADM2 Name and area in hectares
var calculateFeatureArea = function(feature) {
    var areas = areaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: feature.geometry(),
    scale: 30,
    maxPixels: 1e12
    });
    var adm2_name = feature.get('ADM2_NAME');
    return ee.Feature(
      feature.geometry(),
      areas.set('ADM2_NAME', adm2_name));
};
 
//Map Function to Create
var sumArableHectares_byADM2 = adm2_AOI.map(calculateFeatureArea);


//Export to CSV
Export.table.toDrive({
    collection: sumArableHectares_byADM2,
    fileNamePrefix: adm0_name + "_arableLandArea_adm2",
    description: adm0_name + "_arableLandArea_adm2" + "_CSV",
    folder: "", //set based on user preference
    fileFormat: 'CSV',
    selectors: ['ADM2_NAME', 'areaHectares']
    });
    
//Export to SHP
Export.table.toDrive({
    collection: sumArableHectares_byADM2,
    fileNamePrefix: adm0_name + "_arableLandArea_adm2",
    description: adm0_name + "_arableLandArea_adm2" + "_SHAPEFILE",
    folder: "", //set based on user preference
    fileFormat: 'SHP',
    selectors: ['ADM2_NAME', 'areaHectares']
    
    });
//--------------------------END SCRIPT---------------------------------//


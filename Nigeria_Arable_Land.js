var Hansen_GFC = ee.Image("UMD/hansen/global_forest_change_2020_v1_8"),
    SRTM = ee.Image("USGS/SRTMGL1_003"),
    surfaceWater = ee.Image("JRC/GSW1_3/GlobalSurfaceWater"),
    imperviousSurface = ee.Image("Tsinghua/FROM-GLC/GAIA/v10"),
    GFSAD30AFCE_2015_NGA_1 = ee.Image("projects/ee-aboubacarhema94/assets/Nigeria/GFSAD30AFCE_2015_NGA_1"),
    GFSAD30AFCE_2015_NGA_2 = ee.Image("projects/ee-aboubacarhema94/assets/Nigeria/GFSAD30AFCE_2015_NGA_2"),
    GFSAD30AFCE_2015_NGA_3 = ee.Image("projects/ee-aboubacarhema94/assets/Nigeria/GFSAD30AFCE_2015_NGA_3"),
    GFSAD30AFCE_2015_NGA_4 = ee.Image("projects/ee-aboubacarhema94/assets/Nigeria/GFSAD30AFCE_2015_NGA_4"),
    ImperviousSurfaceGMIS = ee.Image("projects/ee-aboubacarhema94/assets/Nigeria/NGA_gmis_impervious_surface_percentage_geographic_30m"),
    ProtectedAreaPoints = ee.FeatureCollection("projects/ee-aboubacarhema94/assets/Nigeria/ProtectedAreaPoints"),
    ProtectedAreaPolygons = ee.FeatureCollection("projects/ee-aboubacarhema94/assets/Nigeria/ProtectedAreaPolygons"),
    GAUL_adm0 = ee.FeatureCollection("projects/ee-aboubacarhema94/assets/Nigeria/gadm41_NGA_0"),
    GAUL_adm1 = ee.FeatureCollection("projects/ee-aboubacarhema94/assets/Nigeria/gadm41_NGA_1"),
    GAUL_adm2 = ee.FeatureCollection("projects/ee-aboubacarhema94/assets/Nigeria/gadm41_NGA_2"),
    geometry = ee.Geometry.Polygon(
        [[[1.175037561550214, 14.64416753722148],
          [1.175037561550214, 3.685553648418307],
          [17.434803186550212, 3.685553648418307],
          [17.434803186550212, 14.64416753722148]]], null, false);




///////////////////////////////////////////////////////////////////////////////////////////////////////

//IFPRI- Calculate Productive Agriculture  
//December 2022
// 
//Description: Scripts Aggregates Cleared Forest and Cropland datasets, masking  permanent water,
          //   and imprevious surfaces to identify arable land in Nigeria at 30m resolution
          
          


//////////////////////////////////////////////////////////////////////////////////////////////////////
//Variables 
Map.setCenter(11,10,6);
var adm0_name = "Nigeria"; 
var deforestCompYear = 15; //Last two digits of year only
var waterOccuring = 10; //Set water occuring less than this value (in %) of the time, it is the frequency with which water was present.

//Get AOI of Interest
////Import GADM data for Nigeria (https://gadm.org/data.html)
var adm0_AOI = GAUL_adm0;
var adm2_AOI = GAUL_adm1;
Map.addLayer(adm2_AOI, {color: 'purple'}, 'Nigeria Admin2 Boundaries');

//////////////////////////////////////////////////////////////////////////////////////////////////////

//Imported GFSAD30AFCE Rasters --> 30m 
//Downloaded from EarthExplorer over Nigeria
  //Download URL: https://search.earthdata.nasa.gov/search
  //Dataset URL: https://lpdaac.usgs.gov/products/gfsad30afcev001/
var GFSAD_1 = GFSAD30AFCE_2015_NGA_1;
var GFSAD_2 = GFSAD30AFCE_2015_NGA_2;
var GFSAD_3 = GFSAD30AFCE_2015_NGA_3;
var GFSAD_4 = GFSAD30AFCE_2015_NGA_4;
//CLip Images to Nigeria Extent --> Mask 
var clipGFSAD_1 = GFSAD_1.clip(adm0_AOI);
//var resolution = clipGFSAD_1.projection().nominalScale();
//print(resolution,'clipGFSAD_1 Resolution');
var clipGFSAD_2 = GFSAD_2.clip(adm0_AOI);
var clipGFSAD_3 = GFSAD_3.clip(adm0_AOI);
var clipGFSAD_4 = GFSAD_4.clip(adm0_AOI);
//Create Image Collection so it can be mosaiced together --> use quality mosaic to get highest 
var GFSAD = ee.ImageCollection([clipGFSAD_1, clipGFSAD_2, clipGFSAD_3, clipGFSAD_4]).mosaic();
var bin = {
  bands: ['b1'],
  min: 0,
  max: 2,
  palette: ['red','yellow' , 'green']
};
//Map.addLayer(GFSAD, bin, adm0_name + ' GFSAD30AFCE Rasters');
//Mask to select Cropland (band b1 = 2)
var aoiCropland = GFSAD.eq(2).selfMask().rename("Cropland");

//Unmask Bands Setting values to zero
var bin = {
  bands: ['Cropland'],
  min: 0,
  max: 1,
  palette: ['red', 'green']
};
//Map.addLayer(aoiCropland, bin, adm0_name + ' Cropland in GFSAD');
var arableFromCropland = aoiCropland.select('Cropland').unmask(0).clip(adm2_AOI)

/////////////////////////////////////////////////////////////////////////////////////////////////////

//Filter Hansen Dataset for cleared forested between 2000 and 2015
var Hansen = Hansen_GFC.clipToCollection(adm0_AOI);
//Create Mask, selecting "loss year layer" less than or equal to 2015
var aoiClearForestMask = Hansen.select("lossyear").lte(deforestCompYear);

//var aoiClearForestMask = Hansen.select("treecover2000").eq(10).rename('lossyear');
//Mask Collection for only forests cleared between 2000 and 2015
var aoiClearedForest = Hansen.mask(aoiClearForestMask);

var treeLossVisParam = {
  bands: ['lossyear'],
  min: 0,
  max: 15,
  palette: ['yellow', 'red']
};
//Map.addLayer(aoiClearedForest, treeLossVisParam, adm0_name + ' Forest Clearance Year');
//Encoded as either 0 (no loss) or else a value in the range 1-20, representing loss detected primarily in the year 2001-2020, respectively.
var aoiClearedForestLoss = aoiClearedForest.select('lossyear').gt(0).selfMask().rename("loss");
var bin = {
  bands: ["loss"],
  min: 0,
  max: 1,
  palette: ['black', 'green']
};
//Map.addLayer(aoiClearedForestLoss, bin, adm0_name + 'Loss forest bands between 2000 and 2015');
var aoiClearedForestLoss = aoiClearedForestLoss.select('loss').unmask(0).clip(adm2_AOI)

/////////////////////////////////////////////////////////////////////////////////////////////////////


//Add Unmasked Image bands together to create arable land image
var calcArableLandAOI = arableFromCropland.select('Cropland').add(aoiClearedForestLoss.select("loss"))
                .rename('arableLand')
                .clip(adm0_AOI);
var aoiCropland = calcArableLandAOI.select("arableLand").gt(0).selfMask().rename("arableLand");
var bin = {
  bands: ["arableLand"],
  min: 0,
  max: 1,
  palette: ['yellow', 'blue']
};
//Map.addLayer(aoiCropland, bin, adm0_name + ' Cropland in GFSAD  + cleared forested between 2000 and 2015');
var aoiCropland = aoiCropland.select('arableLand').unmask(0).clip(adm2_AOI)
//var resolution = aoiCropland.projection().nominalScale();
//print(resolution,'aoiCropland Resolution');



///////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////

////Global Man-made Impervious Surface (GMIS) Dataset From 
/*https://sedac.ciesin.columbia.edu/data/set/ulandsat-gmis-v1/data-download
Estimates of man-made impervioussness percentage (0-100) at 30m spatial resolution derived from global Landsat data for the target year 2010.
The components/bands include:

1. Percent imperviousness

Value:	
0-100	Percent impervious.
200	Areas masked as non-HBASE by the HBASE mask. Users may choose to fill these pixels as 0% impervious.	
255	NoData, including unmapped areas, pixels with SLC (Scan Line Corrector)-off gaps, pixels covered by cloud/shadow.
*/
var GMIS_ImperviousSurface = ImperviousSurfaceGMIS;
//var GMIS_ImperviousSurface = GMIS_ImperviousSurface.select('b1').unmask(0).clip(adm0_AOI);
var value = 0
var mask = GMIS_ImperviousSurface.eq(200);
var impSurfaceGMISAOI = mask.multiply(value).add(GMIS_ImperviousSurface.multiply(mask.not())).rename('impSurfaceGMIS');
var mask = impSurfaceGMISAOI.eq(255);
var impSurfaceGMISAOI = mask.multiply(value).add(impSurfaceGMISAOI.multiply(mask.not())).rename('impSurfaceGMIS');
var impSurfaceGMISAOI = impSurfaceGMISAOI.select('impSurfaceGMIS').unmask(0).clip(adm0_AOI);
var bin = {
  bands: ['impSurfaceGMIS'],
  min: 0,
  max: 255,
  palette: ['grey', '000000']
};
//Map.addLayer(impSurfaceGMISAOI, bin, adm0_name + 'Impervious Surface');


////////////////////
//Impervious Surface
  //Dataset URL: https://developers.google.com/earth-engine/datasets/catalog/Tsinghua_FROM-GLC_GAIA_v10
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
//Map.addLayer(impSurfaceAOI, visualization, adm0_name + 'Impervious Surface FROM-GLC_GAIA_v10');
/////////////////////////////////////////////////////////////////////////////////////////////////////

//Clip JRC Image to Aoi and select "occurrence" band and unmask image so that nonwater pixels are 0
var allWaterAOI = surfaceWater.select('occurrence').unmask(0).clip(adm0_AOI);
var bin = {
  bands: ['occurrence'],
  min: 0,
  max: 100,
  palette: ['00FFFF', '0000FF']
};
//Map.addLayer(allWaterAOI, bin, adm0_name + 'Water occurrence');


//Create Mask selecting water occuring less than waterOccuring% of the time
var WaterOccuring = allWaterAOI.select('occurrence').lte(waterOccuring).selfMask().rename('occurrence');
var bin = {
  bands: ['occurrence'],
  min: 0,
  max: waterOccuring,
  palette: ['00FFFF', '0000FF']
};
//Map.addLayer(WaterOccuring, bin, adm0_name + ' water occuring less than ' + waterOccuring + '%');



///////////////////////////////////////////////////////////////////////////////////////////////////////

var combinedImage = ee.Image.cat([aoiCropland, allWaterAOI, impSurfaceGMISAOI]);
//Mask Selecting Non-Zeros --> not arable land 
var arableLandMask = combinedImage.select("arableLand").eq(1);
var maskedNonArable = combinedImage.updateMask(arableLandMask);
//Create Mask selecting water occuring less than waterOccuring% of the time
var permWaterMask = maskedNonArable.select('occurrence').lte(10);
var maskedpermWater = maskedNonArable.updateMask(permWaterMask);
//Create Mask Eliminating Impermeable Surfaces (not equal to 0) so select 0
//var impermeableSurfaceMask = maskedpermWater.select('change_year_index').eq(0);
var impermeableSurfaceMask = maskedpermWater.select('impSurfaceGMIS').eq(0)
var arableLand = maskedpermWater.updateMask(impermeableSurfaceMask);
var arableLand = arableLand.select('arableLand').unmask(0).clip(adm0_AOI);

//////////////////////////////////////////////////////////////////////////////////////////////////////
var arableLand = arableLand.select('arableLand').eq(1).selfMask();

////////////////////////////////////////////////////////////////////////////////////////////////////

///// world’s protected areas

//https://www.protectedplanet.net/en

Map.addLayer(ProtectedAreaPolygons, {color: 'red'}, 'Protected Areas polygons');
Map.addLayer(ProtectedAreaPoints, {color: 'red'}, 'Protected Areas points');



//////////////////////////////////////////////////
var bin = {
  bands: ["arableLand"],
  min: 0,
  max: 1,
  palette: ['yellow', 'green']
};
var properties = ['REP_AREA']
// Make an image 
var ProtectedAreaPointsImg = ee.Image(properties.map(function(property) {
  return ProtectedAreaPoints.select([property])
    .reduceToImage([property], ee.Reducer.first())
    .clip(adm0_AOI)
 }))
var multiBandMaskImgPoint = ProtectedAreaPointsImg.mask().clip(adm0_AOI);

var mask = multiBandMaskImgPoint.eq(0);
var randImgPoint = multiBandMaskImgPoint.updateMask(mask)

///////

var col = ee.Image(properties.map(function(property) {
  return ProtectedAreaPolygons.select([property])
    .reduceToImage([property], ee.Reducer.first())
    .clip(adm0_AOI)
 }))
//var ProtectedArea = col.add(ProtectedAreaPointsImg);
var multiBandMaskImg = col.mask().clip(adm0_AOI);
//print(multiBandMaskImg)
var mask = multiBandMaskImg.eq(0);
var randImg = multiBandMaskImg.updateMask(mask)

var arableLand = arableLand.select('arableLand').add(randImg.select("first"))
                .rename('arableLand')
                .clip(adm0_AOI);
                
var arableLand = arableLand.select('arableLand').add(randImgPoint.select("first"))
                .rename('arableLand')
                .clip(adm0_AOI);
                
                
var arableLand = arableLand.select('arableLand').eq(1).selfMask();
var bin = {
  bands: ["arableLand"],
  min: 0,
  max: 1,
  palette: ['yellow', 'green']
};
var resolution = arableLand.projection().nominalScale();


var stats = arableLand.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: adm0_AOI,
  scale: resolution,
  maxPixels: 1e12
});
print(stats, "sum of real arableLand binary's band");
Map.addLayer(arableLand, bin, adm0_name + ' Arable land');
//////////////////////////////////////////////////////////////////////////////////////////////////
//Export GeoTIFF  
var projection = arableLand.select('arableLand').projection().getInfo();
// Create a geometry representing an export region.
// Export the image, specifying the CRS, transform, and region.
Export.image.toDrive({
  image: arableLand,
  description: adm0_name + 'arableLand',
  crs: projection.crs,
  crsTransform: projection.transform,
  region: geometry,
  maxPixels: 10000000000000
});

//////////////////////////////////////////////////////////////////////////////////////////////////

//Create a function to calculate the feature class with ADM2 Name and area in hectares
var calculateFeatureSum = function(feature) {
    var areas = arableLand.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: feature.geometry(),
    scale: resolution,
   maxPixels: 10000000000000
    });
    var adm2_name = feature.get('NAME_1');
    return ee.Feature(
      feature.geometry(),
      areas.set('NAME_1', adm2_name));
};
 
//Map Function to Create
var sumArable_byADM2 = adm2_AOI.map(calculateFeatureSum);

//Export to CSV
Export.table.toDrive({
    collection: sumArable_byADM2,
    fileNamePrefix: adm0_name + "_arableLandArea_adm2",
    description: adm0_name + "_arableLandArea_adm2" + "_CSV",
    folder: "", //set based on user preference
    fileFormat: 'CSV',
    selectors: ['NAME_1', 'arableLand']
    });
    
/////////////////////////////////////////////////////////////////////////////
//--------------------------END SCRIPT---------------------------------//


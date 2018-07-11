/**
 * Created by akelley on 7/10/2017.
 */
function Fuse(slice, minRtdose, maxRtdose) {
    var cbarHeight = 3*Math.floor(slice.mri.Columns/120),
        cbarColpos = Math.floor(slice.mri.Columns*1/4),
        cbarRowpos = 0,
        cbarLength = Math.floor(slice.mri.Columns/2);

    // console.log(cbarHeight); console.log(cbarColpos); console.log(cbarRowpos); console.log(cbarLength);

    this.mri = slice.mri;
    this.slice = slice;

    this.FusedImage = new Uint8Array(3 * this.mri.Rows * this.mri.Columns + (this.mri.Rows % 2) * (this.mri.Columns % 2));

    index = 0;
    var doseIndex = 0;
    for(var row = 0; row < this.mri.Rows; row++) {
        for(var col = 0; col < this.mri.Columns; col++) {
            var ctVal = this.mri.scalarForCoordinate(row, col),
                doseVal = rtScalarForIndex(this.mri, doseIndex, minRtdose, maxRtdose),
                color = getColorForDose(doseVal);
            // if(color[0] === 0) {
            //     console.log(doseVal);
            // }
            for(var component = 0; component < 3; component++) {
                // this.FusedImage.set([Math.floor(255.99*( (1-ctVal) * color[component]/3 + ctVal))], index);
                this.FusedImage.set([Math.floor(255.99*(Math.sqrt(0.2*Math.pow(color[component], 2) + 0.8*Math.pow(ctVal, 2))))], index);
                index++;
            }
            doseIndex += Math.ceil(this.mri.BitsAllocated/8);
        }
    }

    //add colorbar
    //todo:: there could be some optimization here
    for(var row = cbarRowpos; row < cbarRowpos + cbarHeight; row++) {
        for(var col = cbarColpos; col < cbarColpos + cbarLength; col++) {
            for(var com = 0; com < 3; com++) {
                var index = this.indexForRowColCom(row, col, com),
                    color = getColorForDose((col - cbarColpos)/cbarLength);
                this.FusedImage.set([Math.floor(255.99*color[com]*.67)], index);
            }
        }
    }

    //add numbers to colorbar
    var digitScale = Math.floor(this.mri.Columns / 120);
    var maxDoseString = Math.round(maxRtdose/100).toString();
    for(var n = 0; n < maxDoseString.length; n++) {
        var digit = getDigits(maxDoseString.charAt(n));
        for(var row = 0; row < 10; row++) {
            for(var col = 0; col < 8; col++) {
                for(var com = 0; com < 3; com++) {
                    if(digit[8 * row + col] === 1) {
                        for (var xs = 0; xs < digitScale; xs++) {
                            for (var ys = 0; ys < digitScale; ys++) {
                                this.FusedImage.set([255], this.indexForRowColCom(digitScale * row + xs + cbarRowpos + cbarHeight + digitScale, cbarColpos + cbarLength + digitScale * (col + 8 * n - maxDoseString.length * 4) + ys, com));
                            }
                        }
                    }
                }
            }
        }
    }


    var minDoseString = Math.round(minRtdose/100).toString();
    for(var n = 0; n < minDoseString.length; n++) {
        var digit = getDigits(minDoseString.charAt(n));
        for(var row = 0; row < 10; row++) {
            for(var col = 0; col < 8; col++) {
                for(var com = 0; com < 3; com++) {
                    if(digit[8 * row + col] === 1) {
                        for (var xs = 0; xs < digitScale; xs++) {
                            for (var ys = 0; ys < digitScale; ys++) {
                                this.FusedImage.set([255], this.indexForRowColCom(digitScale * row + xs + cbarRowpos + cbarHeight + digitScale, cbarColpos + digitScale * (col + 8 * n - maxDoseString.length * 4) + ys, com));
                            }
                        }
                    }
                }
            }
        }
    }
    // console.log(this.FusedImage);
    // set(this.mri.dataSet, "x7fe00010", this.FusedImage, this.mri.bigEndian, false); //PixelData = this.FusedImage
    // set(this.mri.dataSet, "x00280002", shortToBytes(3, this.mri.bigEndian), this.mri.bigEndian, true); //SamplesPerPixel = 3 (this means that there is an r,g,b component for each pixel)
    // set(this.mri.dataSet, "x00280004", encodeString("RGB"), this.mri.bigEndian, false); //PhotometricInterpretation = "RGB"
    // set(this.mri.dataSet, "x00280100", shortToBytes(8, this.mri.bigEndian), this.mri.bigEndian, true); //BitsAllocated = 8
    // set(this.mri.dataSet, "x00280101", shortToBytes(8, this.mri.bigEndian), this.mri.bigEndian, true); //BitsStored = 8
    // set(this.mri.dataSet, "x00280102", shortToBytes(7, this.mri.bigEndian), this.mri.bigEndian, true); //Highbit = 7
    // set(this.mri.dataSet, "x00280106", shortToBytes(0, this.mri.bigEndian), this.mri.bigEndian, true); //SmallestImagePixelValue = 0
    // set(this.mri.dataSet, "x00280107", shortToBytes(255, this.mri.bigEndian), this.mri.bigEndian, true); //LargestImagePixelValue = 255 (0xFF)
    // set(this.mri.dataSet, "x00280108", shortToBytes(0, this.mri.bigEndian), this.mri.bigEndian, true); //SmallestImagePixelValueInSeries = 0
    // set(this.mri.dataSet, "x00280109", shortToBytes(255, this.mri.bigEndian), this.mri.bigEndian, true); //LargestImagePixelValueInSeries = 255 (0xFF)
    /*
     "x00280100" -> BitsAllocated = 8
     "x00280101" -> BitsStored = 8
     "x00280102" -> HighBit = 7
     "x00280002" -> SamplesPerPixel = 3
     "x0028004" -> PhotometricInterpretation = "RGB"
     */
    // insert(this.mri.dataSet, "x00280006", null, shortToBytes(0, this.mri.bigEndian), this.mri.bigEndian, false); //PlanarConfiguration

    this.mri.dataSet.set("x7fe00010", "OB", this.FusedImage);
    this.mri.dataSet.setUint16("x00280002", 3); //SamplesPerPixel
    this.mri.dataSet.setString("x00280004", "CS", "RGB"); //
    this.mri.dataSet.setUint16("x00280006", 0); //PlanarConfiguration
    this.mri.dataSet.setUint16("x00280100", 8); //BitsAllocated = 8
    this.mri.dataSet.setUint16("x00280101", 8); //BitsStored = 8
    this.mri.dataSet.setUint16("x00280102", 7); //HighBit = 7

    if(this.mri.Modality === "MR") {
        this.mri.dataSet.setUint16("x00280106", 0); //SmallestImagePixelValue
        this.mri.dataSet.setUint16("x00280107", 255); //LargestImagePixelValue
        this.mri.dataSet.setUint16("x00280108", 0); //SmallestImagePixelValueInSeries
        this.mri.dataSet.setUint16("x00280109", 255); //LargestImagePixelValueInSeries
    }
    else if(this.mri.Modality === "CT") {
        this.mri.dataSet.setFloatString("x00281050", 128); //WindowCenter
        this.mri.dataSet.setFloatString("x00281051", 256); //WindowCenter
        this.mri.dataSet.setFloatString("x00281052", 0); //RescaleIntercept = 0;
        this.mri.dataSet.setFloatString("x00281053", 1); //RescaleSlope = 1;
    }
}

Fuse.prototype.blob = function() {
    return new Blob([this.mri.dataSet.save()], {type:"application/dicom"});
};

// function mriScalarForCoordinate(mri, r, c) {
//     return (mri.PixelData[r][c]-mri.SmallestPixelValueInSeries)/(mri.LargestPixelValueInSeries-mri.SmallestPixelValueInSeries);
// }
/**
 *
 * @param mri
 * @param index
 * @param MinDose
 * @param MaxDose
 */
//todo:: Check endianness. Endianness should be defined by the "High bit" property
//todo:: definitely do this ^^^^^^^^^^^^^^^
function rtScalarForIndex(mri, index, MinDose, MaxDose) {
    var x = mri.scaling * ((mri.dataSet.elements.x7fe00010.valueBytes[index+1] << 8) | (mri.dataSet.elements.x7fe00010.valueBytes[index]));
    if(x > MinDose) {
        return (x-MinDose) / (MaxDose-MinDose);
    }
    else {
        return 0;
    }
}

Fuse.prototype.indexForRowColCom = function(row, col, com) {
    return 3 * row * this.mri.Columns + 3 * col + com;
    //console.log("(" + row + ", " + col + ", " + com + ") -> " + x);
};
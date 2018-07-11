/**
 * Created by akelley on 6/13/2017.
 */
/**
 *
 * @param elementId "xGGGGEEEE"
 * @param bytes Uint8Array of new bytes to set
 */

//IMPORTANT NOTE: Image is actually ct
//
//
//
//
//
function Image(dataSet) {
    this.dataSet = dataSet;
    this.Modality = dataSet.Modality;
    //this.PrintingBitDepth = dataSet.uint16("x200000a1"); //todo:: There are two bit depth attributes. Check to see which one is the 'correct' one
    this.SliceThickness = dataSet.floatString("x00180050");
    // this.ImagePositionPatient = new Array(3);
    // for(var i = 0; i < 3; i++) {
    //     this.ImagePositionPatient[i] = dataSet.floatString("x00200032", i);
    // }
    this.ImagePositionPatient = dataSet.floatStringArray("x00200032");
    // this.ImageOrientationPatient = new Array(6);
    // for(var i = 0; i < 6; i++) {
    //     this.ImageOrientationPatient[i] = dataSet.floatString("x00200037", i);
    // }
    this.ImageOrientationPatient = dataSet.floatStringArray("x00200037");
    //if the coefficients are "close enough" to 1, choose simple mode
    if (Math.abs(this.ImageOrientationPatient[0]) >= 0.9999 && Math.abs(this.ImageOrientationPatient[4]) >= 0.9999) {
        this.SimpleOrientation = true;
        this.OrientationPositiveMatrix = [this.ImageOrientationPatient[0] > 0, this.ImageOrientationPatient[4] > 0, (this.ImageOrientationPatient[0] > 0) === (this.ImageOrientationPatient[4] > 0)];
    }
    else {
        this.SimpleOrientation = false;
        var a = this.ImageOrientationPatient.subarray(0, 3),
            b = this.ImageOrientationPatient.subarray(3, 6),
            c = crossProduct(a, b);
        this.OrientationMatrix = new Array(3);
        for(var r = 0; r < 3; r++) {
            this.OrientationMatrix[r] = new Array(3);
            this.OrientationMatrix[r][0] = a[r];
            this.OrientationMatrix[r][1] = b[r];
            this.OrientationMatrix[r][2] = c[r];
        }
        console.log(this.OrientationMatrix);
        this.InverseOrientationMatrix = invMatrix(this.OrientationMatrix);
        console.log(this.InverseOrientationMatrix);

    }

    this.SliceLocation = dataSet.floatString("x00201041");

    // this.FrameIncrementPointer =
    this.Rows = dataSet.uint16("x00280010");
    this.Columns = dataSet.uint16("x00280011");
    // this.PixelSpacing = new Array(2);
    // for(var i = 0; i < 2; i++) {
    //     this.PixelSpacing[i] = dataSet.floatString("x00280030");
    // }
    this.PixelSpacing = dataSet.floatStringArray("x00280030");

    this.BitsAllocated = dataSet.uint16("x00280100");
    this.BitsStored = dataSet.uint16("x00280101");
    this.HighBit = dataSet.uint16("x00280102");
    this.PixelRepresentation = dataSet.uint16("x00280103");

    // // var len = dataSet.numStringValues("x3004000c");
    // // this.GridFrameOffsetVector = new Array(len);
    // // for(var i = 0; i < len; i++) {
    // //     this.GridFrameOffsetVector[i] = dataSet.floatString("x3004000c", i);
    // // }
    // this.GridFrameOffsetVector = dataSet.floatStringArray("x3004000c");
    // mri format actually doesnt have a gridframoffsetvector property...
    this.pixelDataElement = dataSet.elements.x7fe00010;
    var pixelDataElement = this.pixelDataElement; //todo:: fix this mess
    this.PixelData = new Array(this.Rows);
    if(this.BitsAllocated === 8) {
        for(var i = 0; i < this.Rows; i++) {
            this.PixelData[i] = new  Uint8Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset + this.Columns * 1 * i, this.Columns);
        }
    }
    else if(this.BitsAllocated === 16) {
        for(var i = 0; i < this.Rows; i++) {
            this.PixelData[i] = new Uint16Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset + this.Columns * 2 * i, this.Columns);
        }
    }
    else if(this.BitsAllocated === 32) {
        for(var i = 0; i < this.Rows; i++) {
            this.PixelData[i] = new Uint32Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset + this.Columns * 4 * i, this.Columns);
        }
    }
    else {
        console.log("Error: BitsAllocated is " + this.BitsAllocated + " (must be 8, 16, or 32)");
    }

    this.StudyInstanceUID = dataSet.text("x0020000d");
    this.SeriesInstanceUID = dataSet.text("x0020000e");
    this.TransferSyntax = dataSet.text("x00020010");
    this.bigEndian = (this.TransferSyntax === "1.2.840.10008.1.2.2");

    this.SeriesNumber = this.dataSet.intString("x00200011");

    if(this.Modality === "CT") {
        this.WindowCenter = this.dataSet.floatString("x00281050");
        this.WindowWidth = this.dataSet.floatString("x00281051");
        this.RescaleIntercept = this.dataSet.floatString("x00281052");
        this.RescaleSlope = this.dataSet.floatString("x00281053");
        // this.minVisibleCTValue = this.WindowCenter - this.WindowWidth/2;
        // this.maxVisibleCTValue = this.WindowCenter + this.WindowWidth/2;
    }
    else if(this.Modality === "MR") {
        // this.SmallestPixelValueInSeries = this.dataSet.uint16("x00280108");
        this.LargestPixelValueInSeries = this.dataSet.uint16("x00280109");

    }
}

Image.prototype.scalarForCoordinate = function(r, c) {
    if(this.Modality === "CT") {
        //due to the nature of CT, many values will return 1.
        //When 1 is returned, it is full white and you cannot see the color of the dose
        //Hence, the scalar
        //https://www.dabsoft.ch/dicom/3/C.11.2.1.2/
        var scalar = 1,
            val = this.RescaleSlope * this.PixelData[r][c] + this.RescaleIntercept;
        if(val <= this.WindowCenter - 0.5 - (this.WindowWidth-1)/2) {
            return 0.0;
        }
        else if(val > this.WindowCenter - 0.5 + (this.WindowWidth-1)/2) {
            return scalar;
        }
        else {
            return scalar*((val - (this.WindowWidth - 0.5))/(this.WindowWidth - 1) + 0.5);
        }
    }
    else if(this.Modality === "MR") {
        return this.PixelData[r][c] / this.LargestPixelValueInSeries;
    }
};

// Image.prototype.getValueAt = function(x, y) {
//     var r = (y - this.ImagePositionPatient[1]) / this.PixelSpacing[1],
//         c = (x - this.ImagePositionPatient[0]) / this.PixelSpacing[0];
//
//     return this.DoseScale * this.DoseGridScaling * interp2(this.PixelData, r, c);
// };

// Image.prototype.getPointForCoordinate = function(r, c) {
//     return [c*this.PixelSpacing[0] + this.ImagePositionPatient[0], -r*this.PixelSpacing[1] + this.ImagePositionPatient[1]];
// };

Image.prototype.relativePointForRowCol = function(r, c) {
    if(this.SimpleOrientation) {
        return [(this.OrientationPositiveMatrix[0] ? 1 : -1) * c * this.PixelSpacing[0] + this.ImagePositionPatient[0],
            (this.OrientationPositiveMatrix[1] ? 1 : -1) * r * this.PixelSpacing[1] + this.ImagePositionPatient[1],
            this.ImagePositionPatient[2]];
    }
    else {
        return addVectors(this.ImagePositionPatient, multMatrix(this.OrientationMatrix, [c * this.PixelSpacing[0], r * this.PixelSpacing[1], 0]));
    }
};

/**
 * interpolates decimal x and y array indices
 * @param array 2 dimensional array
 * @param x 0 <= x <= highest x index
 * @param y 0 <= y <= higest y index
 */
function interp2(array, x, y) {

    if( 0 <= x && x <= array.length - 1 && 0 <= y && y <= array[0].length - 1) {
        console.log(x);
        result = 0;
        //for each of the 4 surrounding pixels, sum overlapping area times value of area
        //this assumes that the area of each pixel is 1
        for(var i = 0; i < 2; i++) {
            for(var j = 0; j < 2; j++) {
                xInt = (i === 0) ? Math.floor(x) : Math.floor(x+1);
                yInt = (j === 0) ? Math.floor(y) : Math.floor(y+1);

                var temp = array[xInt][yInt] * (1-Math.abs(x-xInt)) * (1-Math.abs(y-yInt));
                console.log(temp);
                result += temp;
            }
        }

        return result;
    }
    else {
        return undefined
    }
}
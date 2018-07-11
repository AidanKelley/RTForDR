/**
 * Created by akelley on 6/12/2017.
 */
//todo: Right now, pixel coordinates represent the lower left corner of the pixel. This may need to be changed...
//todo: MAYBE write a DICOM class that both rtdose and CT inherit. I'm not quite sure how to do that in javascript, though.
//units are converted to cGy
function RTDose(dataSet) {
    this.dataSet = dataSet;
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
    this.NumberOfFrames = dataSet.intString("x00280008");
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

    this.DoseUnits = dataSet.string("x30040002");

    if(this.DoseUnits === "GY") {
        this.DoseScale = 100;
    }
    else if(this.DoseUnits === "cGY") {
        this.DoseScale = 1;
    }
    else {
        console.error("Dose units are " + this.DoseUnits + ", but must be of type GY or cGY");
        this.DoseScale = 0;
    }
    // this.DoseType = dataSet.string("x30040004");
    // this.DoseSummationType = dataSet.string("x3004000a");

    // var len = dataSet.numStringValues("x3004000c");
    // this.GridFrameOffsetVector = new Array(len);
    // console.log(len);
    // for(var i = 0; i < len; i++) {
    //     this.GridFrameOffsetVector[i] = dataSet.floatString("x3004000c", i);
    // }
    this.GridFrameOffsetVector = dataSet.floatStringArray("x3004000c");
    this.DoseGridScaling = dataSet.floatString("x3004000e");

    this.pixelDataElement = dataSet.elements.x7fe00010;
    var pixelDataElement = this.pixelDataElement; //todo: something about this
    // if(this.BitsAllocated === 8) {
    //     this.PixelData = new Uint8Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length);
    // }
    // else if(this.BitsAllocated === 16) {
    //     this.PixelData = new Uint16Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length/2); //the 2 is the number of bytes each array element occupies
    // }
    // else if(this.BitsAllocated === 32) {
    //     this.PixelData = new Uint32Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length/4);
    // }
    // else {
    //     console.error("BitsAllocated is " + this.BitsAllocated + " (must be 8, 16, or 32)");
    // }
    //todo:: Could endianness affect this? Test by looking at color images and see if everything looks alright
    this.PixelData = new Array(this.NumberOfFrames); //indexed frames, rows, cols
    var frameSize = this.BitsAllocated/8 * this.Rows * this.Columns,
        rowSize = this.BitsAllocated/8*this.Columns;
    if(this.BitsAllocated === 8 || this.BitsAllocated === 16 || this.BitsAllocated === 32) {
        for(var f = 0; f < this.NumberOfFrames; f++) {
            this.PixelData[f] = new Array(this.Rows);
            for(var r = 0; r < this.Rows; r++) {
                var index = Math.round(pixelDataElement.dataOffset + f * frameSize + r * rowSize);
                if(this.BitsAllocated === 8) {
                    this.PixelData[f][r] = new Uint8Array(dataSet.byteArray.buffer, index, this.Columns);
                }
                else if(this.BitsAllocated === 16) {
                    this.PixelData[f][r] = new Uint16Array(dataSet.byteArray.buffer, index, this.Columns);
                }
                else if(this.BitsAllocated === 32) {
                    this.PixelData[f][r] = new Uint32Array(dataSet.byteArray.buffer, index, this.Columns);
                }
            }
        }
    }

    this.MaxDose = Math.round(this.DoseGridScaling * this.DoseScale * max3(this.PixelData));
    this.MinDose = Math.round(this.DoseGridScaling * this.DoseScale * min3(this.PixelData));

    // console.log(this.getValueAt(0, 0, 0));

    // this.tempArray = new Array(10000);
    // for(var k = 0; k < 10000/2; k++) {
    //     this.tempArray[2*k] = this.dataSet.byteArray[k].toString(16) + this.dataSet.byteArray[k+1].toString(16);
    // }
    // console.log(this.tempArray);
}

/**
 * Returns the interpolated value of the dose (cGy) at values(x, y, z) in mm
 * @param x
 * @param y
 * @param z
 */
RTDose.prototype.getValueAt = function(x, y, z) {
    // var f = (z - this.ImagePositionPatient[2]) / this.SliceThickness,
    //     r = (y - this.ImagePositionPatient[1]) / this.PixelSpacing[1],
    //     c = (x - this.ImagePositionPatient[0]) / this.PixelSpacing[0],
    var point = [(x - this.ImagePositionPatient[0]) / this.PixelSpacing[0],
        (y - this.ImagePositionPatient[1]) / this.PixelSpacing[1],
        (z-this.ImagePositionPatient[2]) / this.SliceThickness],
        coordPoint = [];
    if(this.SimpleOrientation) {
        coordPoint = point;
        if(!this.OrientationPositiveMatrix[0]) {
            coordPoint[0] *= -1;
        }
        if(!this.OrientationPositiveMatrix[1]) {
            coordPoint[1] *= -1;
        }
    }
    else {
        coordPoint = multMatrix(this.InverseOrientationMatrix, point);
    }
    var val = this.DoseScale * this.DoseGridScaling * interp3(this.PixelData, coordPoint[2], coordPoint[1], coordPoint[0]);


    if(val === undefined || val === null || isNaN(val)) {
        return 0;
    }
    else {
        return val;
    }
};



function interp3(array, x, y, z) {
    // console.log(x + ", " + y + ", " + z);
    if( 0 <= x && x <= array.length - 1 &&
        0 <= y && y <= array[0].length - 1 &&
        0 <= z && z <= array[0][0].length - 1)
    {
        var result = 0;
        //for each of the 4 surrounding pixels, sum overlapping area times value of area
        //this assumes that the area of each pixel is 1
        for(var i = 0; i < 2; i++) {
            for(var j = 0; j < 2; j++) {
                for(var k = 0; k < 2; k++) {
                    var xInt = (i === 0) ? Math.floor(x) : Math.floor(x+1),
                        yInt = (j === 0) ? Math.floor(y) : Math.floor(y+1),
                        zInt = (k === 0) ? Math.floor(z) : Math.floor(z+1);
                    // console.log((1 - Math.abs(x - xInt)) + ", " + (1 - Math.abs(y - yInt)) + ", " + (1 - Math.abs(z - zInt)));
                    // console.log(array[xInt][yInt][zInt]);
                    result += array[xInt][yInt][zInt] * (1 - Math.abs(x - xInt)) * (1 - Math.abs(y - yInt)) * (1 - Math.abs(z - zInt));

                }
            }
        }
        // if(result === 0) {
        //     console.log(array[Math.floor(x)][Math.floor(y)][Math.floor(z)]);
        // }
        return result;
    }
    else {
        return undefined
    }
}

function max3(array) {
    var max = 0;

    for(var x = 0; x < array.length; x++) {
        for(var y = 0; y < array[x].length; y++) {
            for(var z = 0; z < array[x][y].length; z++) {
                if(!isNaN(array[x][y][z]) && array[x][y][z] > max) {
                    max = array[x][y][z];
                }
            }
        }
    }

    return max;
}

function min3(array) {
    var min = Number.MAX_VALUE;

    for(var x = 0; x < array.length; x++) {
        for(var y = 0; y < array[x].length; y++) {
            for(var z = 0; z < array[x][y].length; z++) {
                if(!isNaN(array[x][y][z]) && array[x][y][z] < min) {
                    min = array[x][y][z];
                }
            }
        }
    }

    return min;
}

/**
 *
 * @param array 3 dimensional array of any size
 * @param func takes param a, b. a is the currently evaluated element in the array, and b is the current best
 * @returns {*}
//  */
// function findElement3(array, func) {
//     var best = array[0][0][0];
//
//     for(var i = 0; i < array.length; i++) {
//         for(var j = 0; j < array[i].length; j++) {
//             for(var k = 0; k < array[i][j].length; k++) {
//                 if(func(array[i][j][k])) {
//                     best = array[i][j][k];
//                 }
//             }
//         }
//     }
//
//     return best;
// }
// /**
//  * finds max in array
//  * @param array
//  * @returns {*}
//  */
// function max3(array) {
//     return findElement3(array, function(a, b) {
//         return a > b;
//     });
// }
//
// function min3(array) {
//     return findElement3(array, function(a, b) {
//         return a < b;
//     });
// }
/**
 * Created by akelley on 7/19/2017.
 */

//http://blog.acipo.com/matrix-inversion-in-javascript/
function invMatrix(M) {
    // Returns the inverse of matrix `M`.
    // I use Guassian Elimination to calculate the inverse:
    // (1) 'augment' the matrix (left) by the identity (on the right)
    // (2) Turn the matrix on the left into the identity by elemetry row ops
    // (3) The matrix on the right is the inverse (was the identity matrix)
    // There are 3 elemtary row ops: (I combine b and c in my code)
    // (a) Swap 2 rows
    // (b) Multiply a row by a scalar
    // (c) Add 2 rows

    //if the matrix isn't square: exit (error)
    if(M.length !== M[0].length){return;}

    //create the identity matrix (I), and a copy (C) of the original
    var i=0, ii=0, j=0, dim=M.length, e=0, t=0;
    var I = [], C = [];
    for(i=0; i<dim; i+=1){
        // Create the row
        I[I.length]=[];
        C[C.length]=[];
        for(j=0; j<dim; j+=1){

            //if we're on the diagonal, put a 1 (for identity)
            if(i==j){ I[i][j] = 1; }
            else{ I[i][j] = 0; }

            // Also, make the copy of the original
            C[i][j] = M[i][j];
        }
    }

    // Perform elementary row operations
    for(i=0; i<dim; i+=1){
        // get the element e on the diagonal
        e = C[i][i];

        // if we have a 0 on the diagonal (we'll need to swap with a lower row)
        if(e==0){
            //look through every row below the i'th row
            for(ii=i+1; ii<dim; ii+=1){
                //if the ii'th row has a non-0 in the i'th col
                if(C[ii][i] != 0){
                    //it would make the diagonal have a non-0 so swap it
                    for(j=0; j<dim; j++){
                        e = C[i][j];       //temp store i'th row
                        C[i][j] = C[ii][j];//replace i'th row by ii'th
                        C[ii][j] = e;      //repace ii'th by temp
                        e = I[i][j];       //temp store i'th row
                        I[i][j] = I[ii][j];//replace i'th row by ii'th
                        I[ii][j] = e;      //repace ii'th by temp
                    }
                    //don't bother checking other rows since we've swapped
                    break;
                }
            }
            //get the new diagonal
            e = C[i][i];
            //if it's still 0, not invertable (error)
            if(e==0){return}
        }

        // Scale this row down by e (so we have a 1 on the diagonal)
        for(j=0; j<dim; j++){
            C[i][j] = C[i][j]/e; //apply to original matrix
            I[i][j] = I[i][j]/e; //apply to identity
        }

        // Subtract this row (scaled appropriately for each row) from ALL of
        // the other rows so that there will be 0's in this column in the
        // rows above and below this one
        for(ii=0; ii<dim; ii++){
            // Only apply to other rows (we want a 1 on the diagonal)
            if(ii==i){continue;}

            // We want to change this element to 0
            e = C[ii][i];

            // Subtract (the row above(or below) scaled by e) from (the
            // current row) but start at the i'th column and assume all the
            // stuff left of diagonal is 0 (which it should be if we made this
            // algorithm correctly)
            for(j=0; j<dim; j++){
                C[ii][j] -= e*C[i][j]; //apply to original matrix
                I[ii][j] -= e*I[i][j]; //apply to identity
            }
        }
    }

    //we've done all operations, C should be the identity
    //matrix I should be the inverse:
    return I;
}

function scaleMatrix(A, x) {
    for(var i = 0; i < A.length; i++) {
        for(var j = 0; j < A[0].length; j++) {
            A[i][j] *= x;
        }
    }
    return A;
}

function multMatrix(A, B) {
    if(!Array.isArray(B[0])) {
        var newB = new Array(B.length);
        for(var l = 0; l < B.length; l++) {
            newB[l] = [B[l]];
        }
        B = newB;
    }
    // console.log(A);
    // console.log(B);
    if(A[0].length === B.length) {
        var C = new Array(A.length);
        for(var i = 0; i < A.length; i++) {
            C[i] = new Array(B[0].length);
            for(var j = 0; j < B[0].length; j++) {
                C[i][j] = 0;
                for(var k = 0; k < A[0].length; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        if(C[0].length === 1) {
            var x = new Array(C.length);
            for(var r = 0; r < C.length; r++) {
                x[r] = C[r][0];
            }
            // console.log(C[0][0]);
            // console.log(x);
            return x;
        }
        else {
            return C;
        }
    }
    else {
        console.log("mult undef");
        return undefined;
    }
}

function crossProduct(A, B) {
    if(A.length === 3 && B.length === 3) {
        return [A[1]*B[2] - A[2]*B[1],
                A[2]*B[0] - A[0]*B[2],
                A[0]*B[1] - A[1]*B[0]];
    }
    else {
        return undefined;
    }
}

function subtractVectors(x, y) {
    if(x.length === y.length) {
        var z = new Array(x.length);
        for(var i = 0; i < x.length; i++) {
            z[i] = x[i] - y[i];
        }
        return z;
    }
    else {
        console.log("undfef");
        return undefined;
    }
}

function addVectors(x, y) {
    if(x.length === y.length) {
        var z = new Array(x.length);
        for(var i = 0; i < x.length; i++) {
            z[i] = x[i] + y[i];
        }
        return z;
    }
    else {
        console.log("addVectors undefined");
        console.log(x);
        console.log(y);
        return undefined;
    }
}

function translateAboutPoint(p, T, x) {
    return addVectors(p, multMatrix(T, subtractVectors(x, p)));
}
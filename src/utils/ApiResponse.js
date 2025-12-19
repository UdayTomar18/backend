class ApiResponse {
    constuctor(statusCode,data,message ="successs"){
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;

    }
}
export{ApiResponse}
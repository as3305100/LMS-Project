
export class ApiResponse{
    constructor(statusCode, message, data=null){
        this.statusCode = statusCode
        this.message = message
        this.data = data
        this.success = statusCode < 400 ? true : false
        this.status = statusCode < 400 ? "OK" : "fail"
    }

    send(res){
      return res.status(this.statusCode).json({
           statusCode: this.statusCode,
           message: this.message,
           data: this.data,
           success: this.success,
           status: this.status
        })
    }
}
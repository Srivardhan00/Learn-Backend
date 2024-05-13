//wrapper function to handle async nature

const asyncHandler = (fn)=> async(req, res, next) =>{
    try {
        await fn(req, res, next) //making function execute
    } catch (error) {
        //sending error status code
        res.status(error.code||500).json(
            {
                success:false,
                message:error.message
            }
        )
    }
}

export {asyncHandler}
import 'dotenv/config'
import express from 'express'

const app = express()

app.listen(process.env.PORT, ()=>{
    console.log(`Server is listening on Port ${process.env.PORT}`);
})

app.get('/', (req, res)=>{
    res.send('<h1>helloo</h1>')
})
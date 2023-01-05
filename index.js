const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5001;

//middleware
app.use(cors());
app.use(express());

app.get('/', (req, res) => {
    res.send("Doctors portal server is running")
})

app.listen(port, () => {
    console.log("Doctors Portal running on",port)
})
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch');
const http=require('http');
const {Server}=require('socket.io');

require('dotenv').config();


const app = express();
const server= http.createServer(app);
const io = new Server(server,{
    cors:{
        origin:['https://vue-rest.herokuapp.com','https://vue-gui.herokuapp.com'],
        methods:['GET','POST'],
        credentials: true
    },
    allowEIO3:true
});

function authSocket(poruka,next){
    if(poruka.cookies.token==null){
        next(new Error('Nemate dozvolu'));
    }
    else{
        jwt.verify(poruka.cookies.token,process.env.ACCESS_TOKEN_SECRET
            ,(greska, korisnik)=>{
                if(greska){
                    next(new Error(greska))
                }
                else{
                    next();
                }
            })
    }
}

io.on('connection',socket=>{
    //socket.use(authSocket);
    socket.on('comment',poruka=>{
        fetch('https://vue-rest.herokuapp.com/get/getNewest')
        .then(obj=>obj.json() )
            .then(res=>{
                io.emit('comment',JSON.stringify(res));
            })
        .catch(err=>console.log(err)    );
        
    });
    socket.on('error',greska=>{
        socket.emit('error',greska.message);
    });
});

var corsOptions = {
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200
}


app.use(express.json());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.post('/register', (req, res) => {

    const data = {
        korisnickoIme: req.body.korisnickoIme,
        lozinka: req.body.lozinka,
        povlastice:'k'
    };

    fetch('https://vue-rest.herokuapp.com/admin/korisnik/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch( err => res.status(500).json(err));

    obj = {povlastice: req.body.povlastice};

    const token = jwt.sign(obj, process.env.ACCESS_TOKEN_SECRET);
    res.json(token);
});

app.post('/login', async(req, res) => {
    const par1=req.body.korisnickoIme;
    const par2=req.body.lozinka;
    let povlastice='0';
    data={
        korisnickoIme:par1,
        lozinka:par2
    }

    await fetch('https://vue-rest.herokuapp.com/admin/korisnik/checkUserPrivilage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(res => res.json())
    .then(data=>{

        povlastice=data.povlastice;
    }).catch( err => console.log());

    if(povlastice!=='a' && povlastice!=='m' && povlastice!=='k'){
        res.status(400).send("Neispravno korisnicko ime ili lozinka");
    }
    else{
    obj = {povlastice: povlastice};
    
    //ako postoji sacuvaj kolacice
    
    const token = jwt.sign(obj, process.env.ACCESS_TOKEN_SECRET);
    
    let id=null;
    await  fetch('https://vue-rest.herokuapp.com/admin/korisnik/getUserId', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({korisnickoIme:par1})
    }).then(res => res.json())
    .then(data=>{
        id=data.Id;
    }).catch( err => console.log());

    res.cookie("token",token,{secure: false,sameSite:'none'});
    res.cookie("id",id,{secure: false,sameSite:'none'});

    res.header('Access-Control-Allow-Credentials','true');
    res.status(200).send("Ulogovali ste se");
    }
}); 


app.post('/auth', (req, res) => {
    let povlastice='';
    try{
    povlastice= jwt.verify(req.cookies.token,process.env.ACCESS_TOKEN_SECRET);
    }
    catch(err){
        res.status(400).send("Greska pri proveri kolacica "+err);
    }
    console.log(povlastice);
    if(povlastice.povlastice!=='a' && povlastice.povlastice!=='m' && povlastice.povlastice!=='k'){
        res.status(400).send("Niste ulogovani");
    }
    else{
        res.status(200);
    }
});

app.post('/authm', (req, res) => {
    let token=/*req.cookies['token'];*/req.body.povlastice;
    if(token=== 'undefined')
        res.status(500).send("Nemate kolacic");

    
    try{
        const povlastice=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        if(povlastice.povlastice==='m' || povlastice.povlastice==='a')
            res.status(200).send("Uspesno ste ulogovani");
        else
            res.status(400).send("Nemate dobar kolacic");
    }
    catch(err){
        res.status(500).send("Niste ulogovani "+err);
    }
});

app.post('/authLoggedIn', (req, res) => {
    let token=/*req.cookies['token'];*/req.body.povlastice;
    if(token=== 'undefined')
        res.status(500).send("Nemate kolacic");

    
    try{
        const povlastice=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        if(povlastice.povlastice==='m' || povlastice.povlastice==='a' || povlastice.povlastice==='k'){
            res.status(200).send("Uspesno ste ulogovani");
        }
        else{
            res.status(400).send("Nemate dobar kolacic");
        }
    }
    catch(err){
        res.status(500).send("Niste ulogovani "+err);
    }
});



server.listen(process.env.PORT || 11000);
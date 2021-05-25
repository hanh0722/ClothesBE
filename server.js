import express from 'express';
import bodyparser from 'body-parser';
import bcrypt from 'bcrypt';
import knex from 'knex';
import cors from 'cors';

const app = express();

const db = knex({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    }
})

app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors());



app.post('/signin', (req, res) =>{
    const {email, password} = req.body;
    db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data =>{
        const isValid = bcrypt.compareSync(password, data[0].hash);
        if(isValid){
            res.json(data[0]);
        }else{
            res.status(400).json('wrong information');
        }
    }).catch(err => res.status(400).json('err'));
})

app.post('/register', (req, res) =>{
    const {name, age, email, password} = req.body;
    if(!name || !age || !email || !password){
        return res.status(400).json('not valid');
    }
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
    db.transaction(trx =>{
        trx.insert({
            email: email,
            hash: hash
        })
        .into('login')
        .returning('email')
        .then(EmailLogIn =>{
            return trx('users')
            .insert({
                name: name,
                age: age,
                email: EmailLogIn[0]
            }).returning('*')
            .then(user => res.json(user[0]))
            .catch(err => res.status(400).json('cannot create user'));
        })
        .then(trx.commit)
        .catch(trx.rollback)
    }).catch(err => res.status(400).json('cannot transaction'));
})

app.get('/products', (req, res) =>{
    db('products').orderBy('id', 'desc')
    .limit(8)
    .then(data => res.json(data))
    .catch(err => res.status(400).json('err'));
})

app.get('/recentproduct', (req, res) =>{
    db('products').orderBy('id', 'desc')
    .limit(4)
    .then(data => {
        res.json(data);
    }).catch(err => res.status(400).json('err'));
})

app.post('/shop/detail', (req, res) =>{
    const {name} = req.body;
    db.select('*').from('products')
    .where('name', '=', name)
    .then(data => {
        if(data.length === 0){
            res.status(404).json('not found');
        }else{
            res.json(data[0]);
        }
    }).catch(err => res.status(400).json('err'));
});

app.get('/blog', (req, res) =>{
    db.select('*').from('blog')
    .then(data =>{
        res.json(data);
    }).catch(err => res.status(404).json('not found'));
});

app.post('/bill', (req, res) =>{
    const {emailUser, firstName, lastName, companyName, countryRegion, address, phoneNumber, email, items} = req.body;
    // if(!emailUser || !firstName || !lastName || !countryRegion || !address || !phoneNumber || !email || !items){
    //     return res.status(400).json('not fill the blank');
    // }
    db('bills').insert({
        emailuser: emailUser,
        firstname: firstName,
        lastname: lastName,
        companyname: companyName,
        countryregion: countryRegion,
        address: address,
        phonenumber: phoneNumber,
        email: email,
        items: items,
        date: new Date()
    }).returning('*')
    .then(data =>{
        if(data[0].id){
            res.json(data[0]);
        }
        else{
            res.status(404).json('not found');
        }
    }).catch(err => console.log(err));
})


app.listen(process.env.PORT || 3001, () =>{
    console.log(`app is running at port ${process.env.PORT}`);
});

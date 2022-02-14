// dotenv
require("dotenv").config();

// ethers.js init
const { ethers } = require("ethers");
const infuraws = process.env.INFURA_PROJECT_ID;
const fxs_abi = require("./fraxfxsuni.json");
const eth_abi = require("./usdethuni.json");
const erc20_abi = require("./erc20.json");
const fxs_frax_uni = "0xE1573B9D29e2183B1AF0e743Dc2754979A40D237";
const usdc_eth_uni = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc";

//mdb
const { MongoClient } = require("mongodb");
const credentials = "./mdbcert/cert.pem";
var client_mdb;
var database;
var collection;

// Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);


// ethereum node provider connection
const provider = new ethers.providers.WebSocketProvider(
  `wss://mainnet.infura.io/ws/v3/${infuraws}`
);

// Uniswap contract creation
const contract_fxs = new ethers.Contract(fxs_frax_uni, fxs_abi, provider);
const contract_eth = new ethers.Contract(usdc_eth_uni, eth_abi, provider);


// MongoDB Atlas connection, assigns the collection to be used
const connect_mdb = async () => {
    client_mdb = new MongoClient(
    "mongodb+srv://cluster0.qdyeh.mongodb.net/myFirstDatabase?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority",
    {
      sslKey: credentials,
      sslCert: credentials,
    }
  );
  await client_mdb.connect();
    database = client_mdb.db("eth");
    collection = database.collection("users");
  return collection;
};

// dynamic addition to mdb atlas depending on what currency was bought and what was sold
const add_to_db = async (_sender, f_0in, f_0out, f_1in, f_1out, _name0, _name1) => {
    var doc;
    if(f_0in == 0){ // if 1st of pair is the output
        doc = {sender: _sender, sold: f_1in, sold_currency: _name1, bought: f_0out, bought_currency: _name0};
    } else {
        doc = {sender: _sender, sold: f_0in, sold_currency: _name0, bought: f_1out, bought_currency: _name1};
    }
    const result = await collection.insertOne(doc);
    console.log(
        `A document was inserted with the _id: ${result.insertedId}`,
     );
}


// allows us to get details of the tokens from a given uni v2 pair
const get_pair_deci = async (contract) => {
  const token0 = await contract.functions.token0();
  const token1 = await contract.functions.token1();

  const token0contract = new ethers.Contract(token0[0], erc20_abi, provider);
  const token1contract = new ethers.Contract(token1[0], erc20_abi, provider);

  const [decimals0] = await token0contract.functions.decimals();
  const [decimals1] = await token1contract.functions.decimals();

  const [name0] = await token0contract.functions.name();
  const [name1] = await token1contract.functions.name();

  console.log(name0, name1);
  return [decimals0, decimals1, name0, name1];
};


// embeds the twilio logic and returns the proper decimal output for the mongo database function
const output_swap = async (
  sender,
  amount0In,
  amount1In,
  amount0Out,
  amount1Out,
  to,
  token0deci,
  token1deci
) => {
  f_0in = ethers.utils.formatUnits(amount0In, token0deci);
  f_0out = ethers.utils.formatUnits(amount0Out, token0deci);
  f_1in = ethers.utils.formatUnits(amount1In, token1deci);
  f_1out = ethers.utils.formatUnits(amount1Out, token1deci);
  console.log(
    ethers.utils.formatUnits(amount0In, token0deci),
    ethers.utils.formatUnits(amount0Out, token0deci),
    ethers.utils.formatUnits(amount1In, token1deci),
    ethers.utils.formatUnits(amount1Out, token1deci)
  );

  if (f_0in > 10) {
    client.messages
      .create({
        body: `ShaanBot: Just now ${f_0in} dollars were sold in order to buy ${f_1out} of weth. We only do big money.`,
        from: "+18486005188",
        to: "+19292139458",
      })
      .then((message) => console.log(message.sid));
  }
  return [f_0in, f_0out, f_1in, f_1out];
};

const main = async () => {
  const [token0deci, token1deci, name0, name1] = await get_pair_deci(contract_eth);
  // console.log(token0deci, token1deci);
  
  await connect_mdb();
  contract_eth.on(
    "Swap",
    async (sender, amount0In, amount1In, amount0Out, amount1Out, to) =>{
      const [f_0in, f_0out, f_1in, f_1out]  = await output_swap(
        sender,
        amount0In,
        amount1In,
        amount0Out,
        amount1Out,
        to,
        token0deci,
        token1deci
      );
      await add_to_db(sender, f_0in, f_0out, f_1in, f_1out, name0, name1);
    });
};

main();



process.on('SIGINT', function(params) {
    //Shut your db instance here. 
    //close or save other stuff.
    client_mdb.close();
    process.exit();
});
// dotenv
require("dotenv").config();

// ethers.js init
const { ethers } = require("ethers");
const infuraws = process.env.INFURA_PROJECT_ID;
const fxs_abi = require("./abi/fraxfxsuni.json");
const fxs_token_abi = require("./abi/fxs.json");
const weth_token_abi = require("./abi//weth.json");
const eth_abi = require("./abi/usdethuni.json");

// addresses
const fxs_frax_uni = "0xE1573B9D29e2183B1AF0e743Dc2754979A40D237";
const usdc_eth_uni = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc";
const FXS = "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

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
const fxs_token_contract = new ethers.Contract(FXS, fxs_token_abi, provider);
const weth_token_contract = new ethers.Contract(WETH, weth_token_abi, provider);

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
  collection = database.collection("fxs_2");
  return collection;
};


const fxs_twilio = async (from, to, value, event1, decimals) => {
  const formatted_transfer = ethers.utils.formatUnits(value, decimals);
  client.messages
  .create({
    body: `ShaanBot: Just now ${formatted_transfer} FXS were sent from ${from} to ${to}. Check out progress on github.com/shaanfye. We stay winning boys. Neil Agarwal cannot code so he is not.`,
    from: "+18486005188",
    to: "+12012208881",
  })
  .then((message) => console.log(message.sid));
}

const fxs_db = async (from, to, value, event1, decimals) => {
  const formatted_transfer = ethers.utils.formatUnits(value, decimals);
  const p_f_t = parseFloat(formatted_transfer);

  // from address
  const reval = await collection.updateOne(
    { address: from },
    {
      $set: { address: from },
      $inc: { net: -p_f_t, interactions: 1 },
      // $setOnInsert: {}
    },
    {
      upsert: true,
    }
  );
  const valre = await collection.updateOne(
    { address: to },
    {
      $set: { address: to },
      $inc: { net: p_f_t, interactions: 1 },
      // $setOnInsert: {}
    },
    {
      upsert: true,
    }
  );
  console.log("LOOK WHAT WAS SENT =>", reval);
  console.log("LOOK WHAT WAS RECEIVED=>", valre);
};

const main = async () => {
  // connects to mongo
  await connect_mdb();

  // each time new block occurs
  provider.on("block", (blocknumber) =>
    console.log(`This is block number: ${blocknumber}`)
  );

  fxs_token_contract.on("Transfer", async (from, to, value, event1) => {
    console.log(from, to, value, event1);
    await fxs_db(from, to, value, event1, 18);
    await fxs_twilio(from, to, value, event1, 18);
  });
};
main();

process.on("SIGINT", function (params) {
  //Shut your db instance here.
  //close or save other stuff.
  client_mdb.close();
  process.exit();
});


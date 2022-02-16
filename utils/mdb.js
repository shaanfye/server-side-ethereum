
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

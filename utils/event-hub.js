'use strict';

var Client = require('fabric-client');
var client = Client.loadFromConfig('configs/fabric-network-config/connection-profile.yaml');
const mongo = require(__dirname + '/mongo');

const readline = require('readline');
const fs = require('fs');

const latestBlockID = 'latest_block_id';

// ======================================================

function encroll(org) {
    var caService;
    let username = `admin-${org}`;
    let password = `admin-${org}pw`;
    console.log(`Encroll with username ${username}`);
    client.loadFromConfig(`configs/fabric-network-config/${org}-profile.yaml`);

    // init the storages for client's state and cryptosuite state based on connection profile configuration 
    return client.initCredentialStores()
        .then(() => {
            // tls-enrollment
            caService = client.getCertificateAuthority();
            return caService.enroll({
                enrollmentID: username,
                enrollmentSecret: password,
                profile: 'tls',
                attr_reqs: [
                    { name: "hf.Registrar.Roles" },
                    { name: "hf.Registrar.Attributes" }
                ]
            }).then((enrollment) => {
                console.log('Successfully called the CertificateAuthority to get the TLS material');
                let key = enrollment.key.toBytes();
                let cert = enrollment.certificate;

                // set the material on the client to be used when building endpoints for the user
                client.setTlsClientCertAndKey(cert, key);
                return client.setUserContext({ username: username, password: password });
            })
        })
}

function registerEventHub(org, channelID) {
    const collectionName = `latest-block-${channelID}`;
    mongo.findByID(latestBlockID, collectionName)
        .then((doc) => {
            if (doc === null || doc === undefined) {
                doc = {
                    _id: latestBlockID,
                    num: -1
                };
                return mongo.insert(doc, collectionName);
            }
            return doc;
        })
        .then((doc) => {
            console.log('doc ' + JSON.stringify(doc));
            encroll(org)
                .then(() => {
                    return client.getChannel(channelID);
                })
                .then((channel) => {
                    let eventHub = channel.newChannelEventHub(channel.getPeers()[0]);

                    let block_reg = eventHub.registerBlockEvent((block) => {
                        console.log(`Successfully received the block #${block.header.number} from channel ${channelID}`);
                        doc.num = block.header.number;
                        mongo.update({ _id: latestBlockID }, { num: block.header.number }, collectionName);
                        mongo.insertTransactionFromBlock(block, channelID);
                    }, (error) => {
                        console.log('Failed to receive the block event ::' + error);
                    },
                        { startBlock: parseInt(doc.num) + 1, unregister: true, disconnect: true }
                    );
                    eventHub.connect(true);
                })
                .catch(err => {
                    console.log(err);
                });
        })
}

module.exports.registerEventHub = registerEventHub

function registerEventAllHubs() {
    const rl = readline.createInterface({
        input: fs.createReadStream(__dirname + '/../configs/fabric-network-config/channels.txt'),
        crlfDelay: Infinity
    });

    rl.on('line', (channelID) => {
        registerEventHub('org1', channelID);
        console.log(channelID);
    });
}

module.exports.registerEventAllHubs = registerEventAllHubs
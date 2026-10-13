// Idempotent, including the initial period before mongod accepts connections.
let connected = false;
for (let attempt = 0; attempt < 60; attempt++) {
    try {
        const admin = new Mongo('mongodb://mongo:27017/?directConnection=true').getDB('admin');
        let status;
        try { status = admin.runCommand({ replSetGetStatus: 1 }); }
        catch (error) {
            if (error.code !== 94) throw error; // NotYetInitialized
            status = { ok: 0, code: 94 };
        }
        if (status.ok !== 1) {
            if (status.code !== 94) throw new Error(JSON.stringify(status));
            try {
                const result = admin.runCommand({ replSetInitiate: {
                    _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }]
                } });
                if (result.ok !== 1 && result.code !== 23) throw new Error(JSON.stringify(result));
            } catch (error) {
                if (error.code !== 23) throw error; // AlreadyInitialized
            }
        } else if (status.set !== 'rs0') {
            throw new Error('Refusing to change an existing replica set');
        }
        if (admin.runCommand({ hello: 1 }).isWritablePrimary) {
            connected = true;
            break;
        }
    } catch (error) { print(`Mongo initialization attempt ${attempt + 1}: ${error.message}`); }
    sleep(1000);
}
if (!connected) throw new Error('Mongo rs0 did not become PRIMARY');
print('Mongo rs0 PRIMARY ready');

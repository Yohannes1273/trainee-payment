import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Simple in-memory database with file persistence
const collections = {};

function readCollection(name) {
  if (collections[name]) return collections[name];
  const filePath = path.join(DATA_DIR, `${name}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      collections[name] = JSON.parse(content);
    } catch (e) {
      console.error(`Error reading collection ${name}:`, e);
      collections[name] = [];
    }
  } else {
    collections[name] = [];
  }
  return collections[name];
}

function writeCollection(name, data) {
  collections[name] = data;
  const filePath = path.join(DATA_DIR, `${name}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error writing collection ${name}:`, e);
  }
}

export class Schema {
  static Types = {
    ObjectId: String,
  };

  constructor(definition, options = {}) {
    this.definition = definition;
    this.options = options;
    this.statics = {};
    this.methods = {};
    this.pres = {};
    this.posts = {};
    this.virtuals = {};

    // Standard pre-defined fields for Mongoose compatibility
    this.definition._id = { type: String };
    this.definition.createdAt = { type: Date, default: () => new Date() };
    this.definition.updatedAt = { type: Date, default: () => new Date() };
  }

  plugin(pluginFn, options) {
    pluginFn(this, options);
    return this;
  }

  index(fields, options) {
    // Mock index configuration, safe for real Mongoose compatibility
    return this;
  }

  pre(hookName, fn) {
    if (!this.pres[hookName]) this.pres[hookName] = [];
    this.pres[hookName].push(fn);
    return this;
  }

  post(hookName, fn) {
    if (!this.posts[hookName]) this.posts[hookName] = [];
    this.posts[hookName].push(fn);
    return this;
  }

  virtual(name) {
    const virtualObj = {
      get(getterFn) {
        this.getter = getterFn;
        return this;
      },
      set(setterFn) {
        this.setter = setterFn;
        return this;
      }
    };
    this.virtuals[name] = virtualObj;
    return virtualObj;
  }

  set(key, value) {
    this.options[key] = value;
    return this;
  }
}

export class Document {
  constructor(data, modelClass) {
    this._modelClass = modelClass;
    this._schema = modelClass._schema;

    // Apply defaults and initial data
    const schemaDef = this._schema.definition;
    
    // Core properties
    this._id = data._id || 'id_' + Math.random().toString(36).substr(2, 9);
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();

    // Assign standard fields
    for (const key in schemaDef) {
      if (key === '_id' || key === 'createdAt' || key === 'updatedAt') continue;
      
      const fieldDef = schemaDef[key];
      let val = data[key];
      
      if (val === undefined) {
        if (fieldDef && fieldDef.default !== undefined) {
          if (typeof fieldDef.default === 'function') {
            val = fieldDef.default();
          } else {
            val = JSON.parse(JSON.stringify(fieldDef.default)); // deep clone
          }
        }
      }
      this[key] = val;
    }

    // Attach custom methods
    for (const methodName in this._schema.methods) {
      this[methodName] = this._schema.methods[methodName].bind(this);
    }

    // Attach virtuals as real JS properties with getters
    if (this._schema.virtuals) {
      for (const virtualName in this._schema.virtuals) {
        const virt = this._schema.virtuals[virtualName];
        if (virt && virt.getter) {
          Object.defineProperty(this, virtualName, {
            get: virt.getter.bind(this),
            enumerable: true,
            configurable: true
          });
        }
      }
    }
  }

  async save() {
    this.updatedAt = new Date();
    
    // Run pre-save hooks
    const preHooks = this._schema.pres['save'] || [];
    for (const hook of preHooks) {
      await new Promise((resolve, reject) => {
        let resolved = false;
        const next = (err) => {
          if (resolved) return;
          resolved = true;
          if (err) reject(err);
          else resolve();
        };
        const promise = hook.call(this, next);
        if (promise && typeof promise.then === 'function') {
          promise.then(() => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          }).catch((err) => {
            if (!resolved) {
              resolved = true;
              reject(err);
            }
          });
        }
      });
    }

    // Prepare plain object for storage
    const storedObj = {
      _id: this._id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    for (const key in this._schema.definition) {
      if (key === '_id' || key === 'createdAt' || key === 'updatedAt') continue;
      storedObj[key] = this[key];
    }

    const collection = readCollection(this._modelClass._name);
    const index = collection.findIndex(item => item._id === this._id);
    if (index >= 0) {
      collection[index] = storedObj;
    } else {
      collection.push(storedObj);
    }

    writeCollection(this._modelClass._name, collection);

    // Run post-save hooks
    const postHooks = this._schema.posts['save'] || [];
    for (const hook of postHooks) {
      hook.call(this);
    }

    return this;
  }

  toJSON() {
    const obj = {
      _id: this._id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    for (const key in this._schema.definition) {
      if (key === '_id' || key === 'createdAt' || key === 'updatedAt') continue;
      obj[key] = this[key];
    }
    if (this._schema.virtuals) {
      for (const virtualName in this._schema.virtuals) {
        obj[virtualName] = this[virtualName];
      }
    }
    return obj;
  }
}

class MongooseArray extends Array {
  sort(compareFnOrObj) {
    if (compareFnOrObj && typeof compareFnOrObj === 'object') {
      const keys = Object.keys(compareFnOrObj);
      return super.sort((a, b) => {
        for (const key of keys) {
          const dir = compareFnOrObj[key];
          let valA = a[key];
          let valB = b[key];
          
          // Parse as date if needed or handle comparison
          if (valA instanceof Date || (typeof valA === 'string' && !isNaN(Date.parse(valA)))) {
            valA = new Date(valA).getTime();
          }
          if (valB instanceof Date || (typeof valB === 'string' && !isNaN(Date.parse(valB)))) {
            valB = new Date(valB).getTime();
          }
          
          if (valA < valB) return dir === -1 || dir === 'desc' ? 1 : -1;
          if (valA > valB) return dir === -1 || dir === 'desc' ? -1 : 1;
        }
        return 0;
      });
    }
    // Fallback to standard array sorting
    return super.sort(compareFnOrObj);
  }

  limit(num) {
    return MongooseArray.from(this.slice(0, num));
  }

  select(fields) {
    return this; // mock/no-op
  }
}

export function model(name, schema) {
  const modelClass = class extends Document {
    constructor(data = {}) {
      super(data, modelClass);
    }
  };

  modelClass._name = name;
  modelClass._schema = schema;

  // Compile schema statics
  for (const staticName in schema.statics) {
    modelClass[staticName] = schema.statics[staticName].bind(modelClass);
  }

  // Common static queries
  modelClass.find = function(query = {}) {
    const list = readCollection(name);
    
    // Apply soft-delete filter if not specified in query
    const finalQuery = { ...query };
    if (schema.definition.deleted && finalQuery.deleted === undefined) {
      finalQuery.deleted = { $ne: true };
    }

    const matched = list.filter(item => {
      for (const k in finalQuery) {
        const condition = finalQuery[k];
        if (condition && typeof condition === 'object') {
          // Handle simple $ne, $in, $gte, $lte operators
          if ('$ne' in condition) {
            if (item[k] === condition.$ne) return false;
          }
          if ('$in' in condition) {
            if (!condition.$in.includes(item[k])) return false;
          }
          if ('$regex' in condition) {
            const pattern = condition.$regex;
            const options = condition.$options || '';
            const regex = new RegExp(pattern, options);
            if (!regex.test(item[k] || '')) return false;
          }
          if ('$gte' in condition) {
            let itemVal = item[k];
            const condVal = condition.$gte;
            if (condVal instanceof Date) {
              itemVal = new Date(itemVal);
            }
            if (itemVal < condVal) return false;
          }
          if ('$lte' in condition) {
            let itemVal = item[k];
            const condVal = condition.$lte;
            if (condVal instanceof Date) {
              itemVal = new Date(itemVal);
            }
            if (itemVal > condVal) return false;
          }
        } else {
          if (item[k] !== finalQuery[k]) return false;
        }
      }
      return true;
    });

    return MongooseArray.from(matched.map(item => new modelClass(item)));
  };

  modelClass.findOne = function(query = {}) {
    const results = modelClass.find(query);
    return results.length > 0 ? results[0] : null;
  };

  modelClass.findById = function(id) {
    if (!id) return null;
    return modelClass.findOne({ _id: id });
  };

  modelClass.findByIdAndUpdate = async function(id, update, options = {}) {
    const doc = await modelClass.findById(id);
    if (!doc) return null;
    
    for (const key in update) {
      if (key in schema.definition) {
        doc[key] = update[key];
      }
    }
    return await doc.save();
  };

  modelClass.create = async function(data) {
    const doc = new modelClass(data);
    return await doc.save();
  };

  modelClass.deleteOne = async function(query = {}) {
    const doc = await modelClass.findOne(query);
    if (!doc) return { deletedCount: 0 };
    
    const list = readCollection(name);
    const index = list.findIndex(item => item._id === doc._id);
    if (index >= 0) {
      list.splice(index, 1);
      writeCollection(name, list);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  };

  modelClass.countDocuments = function(query = {}) {
    return modelClass.find(query).length;
  };

  return modelClass;
}

const mongoose = {
  Schema,
  model,
  connect: async () => console.log('Mock mongoose connected to local JSON database storage'),
  startSession: async () => {
    return {
      startTransaction: () => {},
      commitTransaction: () => {},
      abortTransaction: () => {},
      endSession: () => {}
    };
  }
};

export default mongoose;

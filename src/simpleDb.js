/**
 * Copyright (c) 2018-present, LeapDAO (leapdao.org)
 *
 * This source code is licensed under the Mozilla Public License Version 2.0
 * found in the LICENSE file in the root directory of this source tree.
 */

let simpledb;

if (process.env.IS_OFFLINE !== 'true' && process.env.npm_lifecycle_event !== 'test') {
  const AWS = require('aws-sdk');
  simpledb = new AWS.SimpleDB({ region: 'eu-west-1' });
}

module.exports = class SimpleDb {

  constructor(tableName) {
    this.sdb = simpledb;
    this.tableName = tableName;
  }

  _method(name, params) {
    return new Promise((resolve, reject) => {
      this.sdb[name](params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  setAttr(itemName, attrName, attrVal) {
    if (!this.sdb) return;
    return this.putAttributes({
      DomainName: this.tableName,
      ItemName: itemName,
      Attributes: [
        { Name: attrName, Value: attrVal, Replace: true },
      ],
    });
  }

  setAttrs(itemName, attrs) {
    if (!this.sdb) return;
    return this.putAttributes({
      DomainName: this.tableName,
      ItemName: itemName,
      Attributes: this.transformAttrs(attrs),
    });
  }

  async getAttr(itemName, defaultValue = {}) {
    if (!this.sdb) return defaultValue;

    const data = await this.getAttributes({
      DomainName: this.tableName,
      ItemName: itemName,
    });

    return Object.assign(defaultValue, this.transformAttrs(data.Attributes || []));
  }

  putAttributes(params) {
    return this._method('putAttributes', params);
  }

  getAttributes(params) {
    return this._method('getAttributes', params);
  }

  /**
   * TODO: support NEXT_TOKEN
   * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SimpleDB.html#select-property
   *
   * @param {String} expr - select expression. Similar to the standard SQL SELECT statement
   * @returns {Array<map>} Array of { Name:string, Attributes:Array<{Name, Value>} }
   */
  select(expr) {
    const params = {
      SelectExpression: expr,
    };
    return new Promise((resolve, reject) => 
      simpledb.select(params, function(err, data) {
        if (err) return reject(err);
        resolve(data.Items);
      }));
  }

  // transform from key/value to list and back
  transformAttrs(data) {
    let attributes;
    if (Array.isArray(data)) {
      attributes = {};
      data.forEach((aPair) => {
        if (!attributes[aPair.Name]) {
          attributes[aPair.Name] = {};
        }
        attributes[aPair.Name] = aPair.Value;
      });
    } else {
      attributes = [];
      Object.keys(data).forEach((anAttributeName) => {
        if (Array.isArray(data[anAttributeName])) {
          data[anAttributeName].forEach((aValue) => {
            attributes.push({
              Name: anAttributeName,
              Value: aValue,
            });
          });
        } else {
          attributes.push({
            Name: anAttributeName,
            Value: data[anAttributeName],
          });
        }
      });
    }
    return attributes;
  }


}
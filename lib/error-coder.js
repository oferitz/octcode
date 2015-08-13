var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var defaults = {
	message: 'unknown error',
	delimiter: '\n'
};

function getNamespace() {
	var ns = '';
	var fileExists = fs.existsSync(path.dirname(require.main.filename) + '/package.json');
	if(fileExists) {
		var projectName = require(path.dirname(require.main.filename) + '/package.json').name;
		if(projectName.indexOf('-') !== -1) {
			var splitName = projectName.split('-');
			for(var i = 0, len = splitName.length; i < len; i++) {
					ns += splitName[i][0];
			}
		}
		else {
			ns = projectName.slice(0, 3);
		}
	}
	else {
		ns = 'default'
	}
	return ns.toUpperCase();
}

function Octcode(namespace, options) {
	if(namespace && !namespace.delimiter && !_.isString(namespace)) {
		throw new Error('namespace is not a string');
	}
	this.reset(namespace, options);
}

Octcode.prototype.init = function(status) {
	this.currentBit = 0;
	this.currentStatus = status || 0;
	this.messages = [];
	this.sum = 0;
};

Octcode.prototype.add = function(newStatusCode, errorMessage) {
	if(!newStatusCode) {
		throw new Error('status code is required');
	}
	if(newStatusCode !== this.currentStatus) {
		this.history[this.currentStatus] = {
			bit: this.currentBit,
			sum: this.sum,
			msg: this.messages
		};

		if(this.history[newStatusCode]) {
			this.currentBit = this.history[newStatusCode].bit;
			this.sum = this.history[newStatusCode].sum;
			this.messages = this.history[newStatusCode].msg;
			this.currentStatus = newStatusCode;
		}
		else {
			this.init(newStatusCode);
		}
	}

	if(this.currentBit === 0) {
		this.currentBit = 1;
		this.sum = 1;
	}
	else {
		var shiftLeft = this.currentBit << 1;
		this.sum += shiftLeft;
		this.currentBit = shiftLeft;
	}
	this.messages.push(errorMessage || defaults.message);
	return {code: this.namespace + newStatusCode + this.sum, errors: this.messages.join(this.delimiter)};
};

Octcode.prototype.reset = function(namespace, options) {
	if(_.isObject(namespace)) {
		this.delimiter = namespace.delimiter || defaults.delimiter;
		this.namespace = getNamespace();
	}
	else {
		this.namespace = namespace || getNamespace();
		this.delimiter = options ? options.delimiter ? options.delimiter : defaults.delimiter : defaults.delimiter;
	}
	this.history = {};
	this.init();
};

Octcode.prototype.get = function(statusCode) {
	if(statusCode && statusCode !== this.currentStatus) {
		var history = this.history[statusCode];
		if(history) {
			return {code: this.namespace + statusCode + history.sum, errors: history.msg.join(this.delimiter)};
		}
		else {
			return new Error('no errors for status code ' + statusCode)
		}
	}
	else {
		return {code: this.namespace + this.currentStatus + this.sum, errors: this.messages.join(this.delimiter)};
	}
};

module.exports = Octcode;
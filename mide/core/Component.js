goog.provide('mide.core.Component');
goog.provide('mide.core.Component.Events');

goog.require('mide.PubSub');
goog.require('mide.core.OperationManager');
goog.require('mide.ui.ConfigurationDialog');

goog.require('goog.events.EventTarget');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.array');
goog.require('goog.string');
goog.require('goog.ui.IdGenerator');


mide.core.Component = function(componentDescriptor, opt_id, opt_config, opt_domHelper) {
	goog.ui.Component.call(this, opt_domHelper);
	
	this.id = opt_id || goog.ui.IdGenerator.getInstance().getNextUniqueId();
	this.descriptor = componentDescriptor;

	this.outputBuffer = {};
	this.inputBuffer = {};
	this.dataProcessors = [];
	
	this.operationManager = new mide.core.OperationManager(this.descriptor.getOperations());

	
	this.configurationDialog = new mide.ui.ConfigurationDialog(componentDescriptor.getParameters());
	this.configurationDialog.createDom();
	
	goog.events.listen(this.configurationDialog, 'change', function() {
		this.dispatchEvent({type: mide.core.Component.Events.CONFIG_CHANGED});
	}, false, this);
	
	if(opt_config) {
		this.setConfiguration(opt_config);
	}
};

goog.inherits(mide.core.Component, goog.events.EventTarget);


/**
 * @type {Object}
 * @public
 */
mide.core.Component.prototype.id = null;


/**
 * @type {mide.ui.ConfigurationDialog}
 * @private
 */
mide.core.Component.prototype.configurationDialog = null;

/**
 * @type {mide.core.OperationManager}
 * @private
 */
mide.core.Component.prototype.operationManager = null;


/**
 * @type {Object.<string, {finished: boolean, requiredInputs: Array.<string>, depends: Array.<string>}>}
 * @private
 */
mide.core.Component.prototype.operations = null;

/**
 * @type {Object.<string, {depends: Array.<string>}>}
 * @private
 */
mide.core.Component.prototype.events = null;


/**
 * Output buffer
 * 
 * @type {Object.<string, Object>}
 * @private
 */
mide.core.Component.prototype.outputBuffer = null;

/**
 * Input buffer
 * 
 * @type {Object.<string, Object>}
 * @private
 */
mide.core.Component.prototype.inputBuffer = null;

/**
 * Data converters
 * 
 * @type {Object.<string, Object>}
 * @private
 */
mide.core.Component.prototype.dataProcessors = null;

/**
 * Called when operation starts.
 * 
 * @public
 */
mide.core.Component.prototype.onOperationStart = function(){};


/**
 * Called when operation ends.
 * 
 * @public
 */
mide.core.Component.prototype.onOperationEnd = function(){};


/**
 * @param {string} id
 * 
 * @public
 */
mide.core.Component.prototype.setId = function(id) {
	if(id) {
		this.id = id;	
	}
};

/**
 * @return {string}
 * 
 * @public
 */
mide.core.Component.prototype.getId = function() {
	return this.id;
};


/**
 * @return {mide.ui.ConfigurationDialog}
 * 
 * @public
 */
mide.core.Component.prototype.getConfigurationDialog = function() {
	return this.configurationDialog;
};


/**
 * @return {mide.core.ComponentDescriptor}
 * 
 * @public
 */
mide.core.Component.prototype.getDescriptor = function() {
	return this.descriptor;
};


/**
 * Tests whether the component can run or that.
 * This is determined by
 * <ol>
 * <li>The component has an autorun method.
 * <li>The component has input data to work with.
 * </ol>
 * 
 * @return {boolean}
 */
mide.core.Component.prototype.isRunnable = function() {
	return this.descriptor.autorun || this.history.getSize() > 0;
};


/**
 * Runs a component. This will either execute the 
 * autorun method or replay the history
 * 
 */
mide.core.Component.prototype.run = function() {
	//TODO: Implement
};



/**
 * Raise event.
 * 
 * @param {string} event name
 * @param {Object} params
 * @protected
 */
mide.core.Component.prototype.triggerEvent = function(name, params) {
	var self = this;
	if(this.id) {
		if(this.operationManager.hasOperation(name)) {
			// operation was performed
			this.end(name);
		}
		var converters = [],
			dataProcessors = this.dataProcessors.slice();
		dataProcessors.reverse();
		
		for(var i = dataProcessors.length; i--;) {
			if(dataProcessors[i].triggerEvent) converters.push(dataProcessors[i]);
		}
		
		var next = function(data) {
			if(converters[0]) {
				converters.shift().triggerEvent(name, data, next);
			}
			else {
				self.triggerEventInternal(name, data);
			}
		};
		next(params);
	}
};

/**
 * Raise event.
 * 
 * @param {string} event name
 * @param {Object} params
 * @private
 */
mide.core.Component.prototype.triggerEventInternal = function(name, params) {
	name = 'output_' + name;
	this.outputBuffer[name] = params;
	mide.PubSub.triggerEvent(this, name, params);
};


/**
 * Returns a option name - value mapping.
 * 
 * @return {Object.<string, {value: string, display: string}} the configuration 
 */
mide.core.Component.prototype.getConfiguration = function() {
	return this.configurationDialog.getConfiguration();
};

/**
 * Sets the configuration of the component. The values must be objects
 * in {@code {value: string, display: string}} form.
 * 
 * @param {Object.<string, {value: string, display: string}} config
 */
mide.core.Component.prototype.setConfiguration = function(config) {
	return this.configurationDialog.setConfiguration(config);
};


/**
 * Calls an operation of the component. If the component
 * has a method {@code op_operation}, this method is expected to
 * implement the logic for this operation.
 * 
 * Calls data converters in reverse order.
 * 
 * @param {string} operation the name of the operation
 * @param {Object.<string, ?>} params parameters
 * @public
 */
mide.core.Component.prototype.perform = function(operation, params) {
	operation = operation.replace(/^input_/, '');
	var op = this.operationManager.getOperation(operation),
		self = this;
	if(op) {
		// cache parameters for later invocation
		this.inputBuffer[operation] = params;
		// record operation in history
		this.operationManager.record(operation, params);
		
		if(this.operationManager.hasUnresolvedDependencies(operation)) {
			return;
		}
		else {
			var converters = [];
			for(var i = this.dataProcessors.length; i--;) {
				if(this.dataProcessors[i].perform) converters.push(this.dataProcessors[i]);
			}
			
			var next = function(data) {
				if(converters[0]) {
					converters.shift().perform(operation, data, next);
				}
				else {
					self.performInternal(operation, data);
				}
			};
			this.start(operation);
			next(params);
		}
	}
	else {
		throw new Error('[Operation call error] Component {' + this.name + '} does not support operation' + operation);
	}
};

/**
 * Calls an operation of the component. If the component
 * has a method {@code op_operation}, this method is expected to
 * implement the logic for this operation.
 * 
 * @param {string} operation the name of the operation
 * @param {Object.<string, ?>} params parameters
 * @private
 */
mide.core.Component.prototype.performInternal = function(operation, params) {
	var op = this.operationManager.getOperation(operation),
		func;
	
	if(op.isInputValid(params)) {
		var self = this;
		func = this['op_' + operation] || function(){
			if (operation+"Output" in self.events) {
				self.triggerEvent(operation, {});
			}
		};
		if(!op.isAsync()) {
			var old_func = func;
			// we can mark the operation as finished automatically
			func = function(params) {
				old_func.call(this, params);
				this.operationManager.resolve(operation);
			};
		}
		func.call(this, params);	
	}
	else {
		throw new Error('[Operation call error] Operation {' + operation + '}: Missing parameter(s)');
	}
};


/**
 * Used internally to make a named Ajax request, as defined in the 
 * component description.
 * 
 * If {@code postData} is provided, a POST request is performed.
 * 
 * 
 * @param {string} name - the name of the request as defined in description
 * @param {string} url
 * @param {Object.<string, string>} getData - GET data mapping
 * @param {Object.<string, string>} postData - POST data mapping
 * @param {function(Object)} cb - function beeing called upon request complication.
 * 									The argument passed is the parsed JSON response.
 * 
 * @private
 */

mide.core.Component.prototype.makeRequest = function(name, url, getData, postData, cb) {
	this.start(name);
	var self = this;
	//TODO Update to new net interface
	var convertersRequest = [],
		dataProcessors = this.dataProcessors.slice();
	dataProcessors.reverse();
	for(var i = dataProcessors.length; i--;) {
		if(dataProcessors[i].makeRequest) convertersRequest.push(dataProcessors[i]);
	}
	var convertersResponse = convertersRequest.slice();
	convertersResponse.reverse();

	var next = function(name, url, getData, postData) {
		if(convertersRequest[0]) {
			convertersRequest.shift().makeRequest(name, url, getData, postData, next);
		}
		else {
			mide.core.net.makeRequest({
				url: url, 
				parameters: getData, 
				data: postData, 
				complete: function(response) {
					while(convertersResponse[0]) {
						response = convertersResponse.shift().makeResponse(name, response);
					}
					cb(response);
				}
			});
		}
	};
	next(name, url, getData, postData);
};

/**
 * Mark the start of an operation/request/event.
 * 
 * @param {string} operation
 * 
 * @private
 */
mide.core.Component.prototype.start = function(operation) {
    this.dispatchEvent({type: mide.core.Component.Events.OPSTART, operation: operation});
    this.onOperationStart(operation);
};

/**
 * Mark the end of an operation/request/event.
 * 
 * @param {string} operation
 * 
 * @private
 */
mide.core.Component.prototype.end = function(operation) {
	this.dispatchEvent({type: mide.core.Component.Events.OPEND, operation: operation});
	this.onOperationEnd(operation);
};



/**
 * Connects two components. {@code operation} on {@code target} will
 * be invoked when {@code event} is raised.
 * 
 * @param {string} event
 * @param {mide.core.Component} target
 * @param {string} operation
 */
mide.core.Component.prototype.connect = function(src, event, target, operation) {
	if(src === this) {
		mide.PubSub.connect(this, event, target, operation);
		if(this.outputBuffer[event]) {
			mide.PubSub.triggerEvent(this, event, this.outputBuffer[event]);
		}
	}
};

/**
 * Disconnects two components.
 * 
 * @param {string} event
 * @param {mide.core.Component} target
 * @param {string} operation
 */
mide.core.Component.prototype.disconnect = function(src, event, target, operation) {
	if(src === this) {
		mide.PubSub.disconnect(this, event, target, operation);
	}
	else {
		operation = operation.replace(/^input_/, '');
		this.operationManager.purge(operation);
		delete this.inputBuffer[operation];
	}
};



/**
 * Gets the content node of the component.
 * 
 * @return {?Element}
 * 
 * @private
 */
mide.core.Component.prototype.getContentNode = function() {
	var div = document.createElement('div'),
		content = this.getContentNodeInternal();
	if(content) {
		div.appendChild(content);
	}
	
	for(var i = 0, l = this.dataProcessors.length; i < l;i++) {
		if(this.dataProcessors[i].getContentNode) {
			div.appendChild(this.dataProcessors[i].getContentNode());
		}
	}
	return div;
};


mide.core.Component.prototype.getContentNodeInternal = function() {
	
};


mide.core.Component.prototype.addDataProcessor = function(processor) {
	processor.setComponentInstance(this);
	this.dataProcessors.push(processor);
};

mide.core.Component.prototype.setDataProcessors = function(processors) {
	for(var i = 0, l = processors.length; i < l; i++) {
		this.addDataProcessor(processors[i]);
	}
};

/**
 * @param {Object}
 */
mide.core.Component.prototype.setData = function(data, value) {
	this.descriptor.setData(data, value);
};

/**
 * @param {Object} a map of mide.core.Parameter 
 */
mide.core.Component.prototype.getData = function(key) {
	return this.descriptor.getData(key);
};



mide.core.Component.prototype.getInputs = function() {
	var operations = this.operationManager.getOperations(),
		inputs = [];
	for(var name in operations) {
		if(!operations[name].isInternal()) {
			inputs.push('input_' + name);
		}	
	}
	return inputs;
};


mide.core.Component.prototype.getOutputs = function() {
	var operations = this.operationManager.getOperations(),
		outputs = [];
	for(var name in operations) {
		if(operations[name].getOutputs().length > 0) {
			outputs.push('output_' + name);
		}
	}
	
	var events = this.descriptor.getEvents();
	for(var j = events.length; j--; ) {
		outputs.push('output_' + events[j].ref);
	}
	return outputs;
};



/**
 * List of events 
 * 
 * @type {Object}
 */
mide.core.Component.Events = {
		OPSTART: 'opstart',
		OPEND: 'opend',
		CONFIG_CHANGED: 'config_changed'
};
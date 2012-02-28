goog.provide('jsm.ui.input.BaseInput');

goog.require('jsm.util.OptionMap');

goog.require('goog.events.EventTarget');
goog.require('goog.events.EventHandler');
goog.require('goog.dom');

/**
 * The base implementation for input classes.
 * 
 * @param {string} name The name of the input element should correspond to the
 *     name of the configuration option in the model file.
 * @param {string} label The visible label used in the UI
 * @param {jsm.util.OptionMap} opt_options
 * 
 * @interface
 * @extends goog.events.EventTarget
 * @constructor
 */
jsm.ui.input.BaseInput = function(name, label, opt_options) {
	goog.events.EventTarget.call(this);

	this.name = name || '';
	this.label = label || '';
	this.options = opt_options || new jsm.util.OptionMap();
	this.eh = new goog.events.EventHandler(this);
	this.dom_ = goog.dom;
};

goog.inherits(jsm.ui.input.BaseInput, goog.events.EventTarget);


/**
 * The name of the input element should correspond to the
 * name of the configuration option in the model file.
 * 
 * @type {string}
 * @private
 */
jsm.ui.input.BaseInput.prototype.name = '';

/**
 * The visible label used in the UI
 * 
 * @type {string}
 * @private
 */
jsm.ui.input.BaseInput.prototype.label = '';

/**
 * @type {jsm.util.OptionMap}
 * @private
 */
jsm.ui.input.BaseInput.prototype.options = null;


/**
 * @type {Element}
 * @private
 */
jsm.ui.input.BaseInput.prototype.labelElement_ = null;

/**
 * Input element place holder. Child classes can store the implementation
 * specific element here.
 * 
 * @type {Element}
 * @private
 */
jsm.ui.input.BaseInput.prototype.labelElement_ = null;

/**
 * @type {Element}
 * @private
 */
jsm.ui.input.BaseInput.prototype.element_ = null;


/**
 * @type {goog.events.EventHandler}
 * @private
 */
jsm.ui.input.BaseInput.prototype.eh = null;

/**
 * @type {goog.dom}
 * @private
 */
jsm.ui.input.BaseInput.prototype.dom_ = null;

/**
 * Renders the input element either in provided container or
 * returns a new element.
 * 
 * @param {Element} container
 * @public
 */
jsm.ui.input.BaseInput.prototype.render = function(container) {
	var elem = this.element_ = container || goog.dom.createElement('div');
	goog.dom.removeChildren(elem);
	
	this.labelElement_ = goog.dom.createDom('label', 
			{'for': this.options.get('name')}, 
			goog.dom.createTextNode(this.options.get('label'))
	);
	var internal = this.renderInternal_();
	if(internal) {
		
		goog.dom.append(elem, this.label, goog.dom.createElement('br'), internal);
	}
	if(!container) {
		return elem;
	}
};

/**
 * @return {Element}
 * @private
 */
jsm.ui.input.BaseInput.prototype.renderInternal_ = function() {
   // must be implemented by child classes
};

/**
 * Called when an input element should update its display or values. Does
 * nothing by default.
 * 
 * @public
 */
jsm.ui.input.BaseInput.prototype.update = function() {
};

/**
 * Called to get the current value of the UI component.
 * 
 * @return {string|Object} Returns either a string or a
 *     <code>{value: "...", display: "..."}</code> map.
 * 
 * @public
 */
jsm.ui.input.BaseInput.prototype.getValue = function() {
};

/**
 * Called to set the current value of the UI component.
 * 
 * @param {string|Object} value Can either be a string or a
 *     <code>{value: "...", display: "..."}</code> map.
 * 
 * @public
 */
jsm.ui.input.BaseInput.prototype.setValue = function(value) {
};

/**
 * @public
 */
jsm.ui.input.BaseInput.prototype.getName = function() {
	return this.name;
};


/**
 * @public
 */
jsm.ui.input.BaseInput.prototype.isEmpty = function() {
	return this.getValue().value === "";
};

jsm.ui.input.BaseInput.prototype.clear = function() {
};

/**
 * @override
 */
jsm.ui.input.BaseInput.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');
	this.element_ = null;
	this.labelElement_ = null;
	this.inputElement_ = null;
};

/**
 * Events generated by input elements.
 * 
 * @type {Object}
 * @enum
 */
jsm.ui.input.BaseInput.Events = {
	CHANGE: 'change'
}

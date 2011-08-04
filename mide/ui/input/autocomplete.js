goog.provide('mashupIDE.ui.input.Autocomplete');
goog.require('mashupIDE.ui.input.InputFactory');
goog.require('mashupIDE.ui.input.BaseInput');
goog.require('mashupIDE.ui.input.autocomplete.Matcher');

goog.require('goog.ui.AutoComplete');
goog.require('goog.ui.AutoComplete.Renderer');
goog.require('goog.ui.AutoComplete.InputHandler');
goog.require('goog.dom');
goog.require('goog.array');

mashupIDE.ui.input.Autocomplete = function(options, events, opt_domHelper) {
	this.lastDisplay_ = '';
	this.lastValue_ = '';
	this.data = [];
	mashupIDE.ui.input.BaseInput.call(this, options, events, opt_domHelper);
};

goog.inherits(mashupIDE.ui.input.Autocomplete, mashupIDE.ui.input.BaseInput);

mashupIDE.ui.input.Autocomplete.prototype.createInputNode = function() {
	this.input = this.dom_.createDom('input', {
		name : this.options.get('name')
	});
	var valueMapper = this.options.get('valueMapper'), 
		self = this;

	var renderer = new goog.ui.AutoComplete.Renderer();
	var inputhandler = new goog.ui.AutoComplete.InputHandler(null, null, false,
			300);
	var matcher = new mashupIDE.ui.input.autocomplete.Matcher(this.options.get('search_parameter'), 
			this.options.get('url'), 
			function(txt) {
		self.data = JSON.parse(txt);
		return goog.array.map(self.data, function(v) {
			return v[valueMapper];
		});
	});

	var ac = new goog.ui.AutoComplete(matcher, renderer, inputhandler);
	
	goog.events.listen(ac, goog.ui.AutoComplete.EventType.UPDATE, function(e) {
		this.lastDisplay_ = e.row;
		this.dispatchEvent({
		      type: 'change'
		});
	}, false, this);

	inputhandler.attachAutoComplete(ac);
	inputhandler.attachInputs(this.input);
};

/**
 * @override
 */
mashupIDE.ui.input.Autocomplete.prototype.getValue = function() {
	var valueMapper = this.options.get('valueMapper');
	var obj = goog.array.find(this.data, function(v) {
		return this.lastDisplay_ == v[valueMapper];
	}, this);
	if(obj) {
		this.lastValue_ = obj[this.options.get('idMapper')];
	}
	return {value: this.lastValue_, display: this.lastDisplay_};
};

/**
 * @override
 */
mashupIDE.ui.input.Autocomplete.prototype.setValue = function(value) {
	if(!this.input) this.createInputNode();
	this.lastDisplay_ = value.display;
	this.lastValue_ = value.value;
	this.input.value = this.lastDisplay_;
	this.dispatchEvent({
	      type: 'change'
	});
};

mashupIDE.ui.input.InputFactory.registerInput('autocomplete',
		mashupIDE.ui.input.Autocomplete);
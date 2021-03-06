goog.provide('jsm.util.OptionMap');

goog.require('goog.object');
goog.require('goog.array');
goog.require('goog.json');


/**
 * Provides a means to access 
 * <code><pre>
 * &lt;option name="..." value=".." /&gt;
 * &lt;option name="..."&gt;
 *     &lt;option name="..." value=".." /&gt;
 * &lt;/option&gt;
 * </pre></code> options parsed by {@link jsm.parser} from a component model file. The expected input
 * is therefore
 * <code>[{name:'...', value:'...'}, {name:'...', option:[{name:'...', value:'...'}]}</code>
 * <br>
 * <br>
 * Added value is the dynamic resolution of <code>{name}</code> substrings in value strings.
 * <code>name</code> will be looked up in a provided context map and replaced by the
 * corresponding value. Optionally, the value can be extracted by a callback function.
 * 
 * 
 * @param {Array} options an array of option objects (might be nested)
 * @param {Object} opt_context a name map to look up {name} in string values
 * @param {function(?, string, Object): string=} opt_extractorFunc a function to extract the value
 *      for <code>{name}</code> from the name map. Takes three parameters: The value
 *      of <code>opt_context[name]</code>, <code>name</code> and 
 *      <code>opt_context</code>
 * @constructor
 */
jsm.util.OptionMap = function(options, opt_context, opt_extractorFunc) {
	
	this.optionsMap_ = {};
	this.optionsArray_ = [];
	this.context_ = opt_context || this.optionsMap_;
	this.extractorFunc_ = opt_extractorFunc || null;
	
	this.parseOptions_(options, this.context_, this.extractorFunc_);
};


/**
 * Name-value map
 * 
 * @type {Object} each value is either a string or another option map
 * @private
 */
jsm.util.OptionMap.prototype.optionsMap = null;


/**
 * Keep an ordered list of the options
 * 
 * @type {Array}
 * @private
 */
jsm.util.OptionMap.prototype.optionsArray_ = null;


/**
 * A name map to look up <code>{name}</code> in string values
 * 
 * @type {Object}
 * @private
 */
jsm.util.OptionMap.prototype.context_ = null;

/**
 * @type {function}
 * @private
 */
jsm.util.OptionMap.prototype.extractorFunc_ = null;



/**
 * Does the actual parsing.
 * 
 * @param {Array} options an array of options objects (might be nested)
 * @param {Object} opt_context a name map to look up {name} in string values
 * @param {function} opt_extractorFunc a function to extract the value
 *      for <code>{name}</code> from the name map. Takes three parameters: The value
 *      of <code>opt_context[name]</code>, <code>name</code> and 
 *      <code>opt_context</code>
 *                              
 * @private
 */
jsm.util.OptionMap.prototype.parseOptions_ = function(options, context, extractor_func) {
	options = options || [];
	var value;
	for(var k in options) {
	//	if(goog.isObject(options[k])) {
	//		value = new jsm.util.OptionMap(options[k], context, extractor_func);
	//	}
	//	else {
			value = options[k];
	//	}
		this.optionsMap_[k] = value;
		this.optionsArray_.push({name: k, value: value});
	}
};


/**
 * Retrieve the value for <code>name</code>. Might be a string
 * or another jsm.util.OptionMap.
 * 
 * @param {string} name option name
 * @return {?string|jsm.util.OptionMap} The value or <code>null</code> if not present
 * 
 * @public
 */
jsm.util.OptionMap.prototype.get = function(name, context, func) {
	if(name in this.optionsMap_) {
		return this.getValue_(this.optionsMap_[name], context, func);
	}
	return null;
};


/**
 * Internal method to get an options value. Resolves <code>{names}s</code>
 * if present.
 * 
 * @param {string} value
 * @return {string}
 * 
 * @private
 */
jsm.util.OptionMap.prototype.getValue_ = function(value, context, func) {
    var pattern = /\{(?:\w+\()?[^}]+\)?\}/;
    context = context || this.context_;
    func = func || func === null ? func : this.extractorFunc_;
    if(goog.isString(value)) {
        return  pattern.test(value) ? this.resolveDvalue_(value, context, func) : value;
    }
    else if(goog.isArray(value)) {
        return goog.array.map(value, function(value) {
            return this.getValue_(value, context, func);
        }, this);
    }
    else if(goog.isObject(value)) {
        return goog.object.map(value, function(value) {
            return this.getValue_(value, context, func);
        }, this);
    }
    else {
        return value;
    }
};


/**
 * Gets the value, resolving <code>{names}</code>s contained in <code>dvalue</code>
 * in the context of <code>context</code>.
 * 
 * @param {string} dvalue
 * @param {Object} context
 * @param {function=} opt_extractor_func
 * @return {string}
 * 
 * @private
 */
jsm.util.OptionMap.prototype.resolveDvalue_ = function(dvalue, context, opt_extractor_func) {
    // values might contain { and } literally, they have to be escaped with \, i.e.
    // "some value \\{ here \\} {substitute.this}"
    // to make parsing easier, these values are substituted first with another value
    var rep_map = {
        '\\{': "\u0002",
        '\\}': "\u0003"
    },
    self = this;

    // replace escapced { and }
    dvalue = dvalue.replace(/\\\{|\\\}/g, function(match) {
        return rep_map[match];
    });

    // test whether the whole string is a function call
    // "{functionName(to.substitute)}"
    // if it is, the result of the function call is returned instead
    // of the substituted string
    var match = dvalue.match(/^\{(\w+)\(([^)]*)\)\}$/),
        func = function(x) { return x;};

    if(match) {
        func = this.func[match[1]] || func;
        dvalue = match[2];
        var value = goog.getObjectByName(dvalue, context);
        return  func((opt_extractor_func) ? opt_extractor_func(value || null, dvalue, context) : value);
    }

    // replace "{foo.bar}" by the corresponding value in the context
    // and 
	return func(dvalue.replace(/\{([^}]+)\}/g, function(str, input) {
        var value = goog.getObjectByName(input, context);
		var result = (opt_extractor_func) ? opt_extractor_func(value || null, input, context) : value;
        if(!goog.isString(result)) {
            result = goog.isObject(result) ? goog.json.serialize(result) : result;
        }
        return result;
	}).replace(/\u0002/g, '{').replace(/\u0003/g, '}'));
};

/**
 * Add a new option with name <code>name</code> and value <code>value</code>
 * 
 * @param {string} name - option name
 * @param {string} value
 * 
 * @public
 */
jsm.util.OptionMap.prototype.set = function(name, value) {
	this.optionsMap_[name] = value;
	this.optionsArray_.push({name:name, value:value});	
};


/**
 * Tests for existence of <code>name</code>.
 * 
 * @param {string} name
 * @return {boolean}
 * 
 * @public
 */
jsm.util.OptionMap.prototype.has = function(name) {
	return name in this.optionsMap_;
};


/**
 * Iterates over all options and executes <code>callback</code> for every option in the map.
 * 
 * @param {function} callback The function to execute for every element. Gets three parameters:
 *  <code>name</code>, the name of the option, <code>value</code>, the value of the option,
 *  <code>index</code>, the index of the option.
 * @param {Object} opt_context The object, <code>this</code> should refer to in the callback.
 * 
 * @this {window|opt_context}
 * 
 * @public
 */
jsm.util.OptionMap.prototype.each = function(callback, opt_context) {
	var option;
	for(var i = 0, l = this.optionsArray_.length; i < l; i++) {
		option = this.optionsArray_[i];
		callback.call(opt_context, option.name, this.getValue_(option.value), i);
	}
};


jsm.util.OptionMap.prototype.func = {
    'parse': function(value) {
        return goog.isObject(value) ? value : goog.json.parse(value);
    },
    'stringify': function(value) {
        return goog.json.serialize(value);
    }
};


jsm.util.OptionMap.get = function(obj, key, context, extr_funct) {
	var map = new jsm.util.OptionMap(obj, context, extr_funct);
	if(key) {
		return map.get(key);
	}
	else {
		return goog.object.map(obj, function(value, key) {
			return map.get(key) || '';
		});
	}
};


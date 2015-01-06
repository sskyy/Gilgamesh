var _ = require("lodash")

function DataObject( config ){
  var root = this

  _.forEach(["$$dirty","$$filled","$$validated", "$$empty", "$$validating", "$$saving" , "$$saved","$$deleting","$$deleted"],function(key){
    root.definePrivateProp(key, false)
  })

  _.forEach(["$$watchers","$$changes","$$actions"],function(key){
    root.definePrivateProp(key, {})
  })

  root.definePrivateProp("$$config",_.defaults( config,{
    globalWatcherName : "/"
  }))
}

DataObject.prototype.set =function(obj){
  _.extend( this, obj )
  this.changePropAndNotify("$$filled",true)
}

DataObject.prototype.definePrivateProp = function( prop, initial ){
  Object.defineProperty(this, prop, {
    value: initial,
    enumerable : false,
    writable: true,
    configurable: false
  })
}

DataObject.prototype.changePropAndNotify = function( status, val ){
  var oldValue = this[status]
  this[status] = val

  this.dispatchChange({name:status,oldValue:oldValue},status)
  //notify all global listener
  this.dispatchChange( {}, this.$$config.globalWatcherName )
}


/*
 * instance methods
 */
DataObject.prototype.invokeDataSourceMethod = function( method ){
  var args = _.toArray(arguments).slice(1)
  if( !this.$$config.methods || !this.$$config.methods[method] ) return  console.log( "DataSource method", method, "not passed in")

  //DataSource method has already bind this to DataSource, so don't worry about `this` set to null.
  return this.$$config.methods[method].apply( null, args)
}

DataObject.prototype.invokeDataSourceMethodWithStatus = function( method, currentStatus, pastStatus){
  var root = this
  root.changePropAndNotify(currentStatus,true)
  root.changePropAndNotify(pastStatus,false)
  return this.invokeDataSourceMethod(method, this).then(function(){
    root.changePropAndNotify(pastStatus,true)
  }).fin(function(){
    root.changePropAndNotify(currentStatus,false)
  })
}

DataObject.prototype.validate = _.partial(DataObject.prototype.invokeDataSourceMethodWithStatus,"validate","$$validating","$$validated")
DataObject.prototype.save = _.partial(DataObject.prototype.invokeDataSourceMethodWithStatus,"save","$$saving","$$saved")
DataObject.prototype.delete = _.partial(DataObject.prototype.invokeDataSourceMethodWithStatus,"delete","$$deleting","$$deleted")

//need to be implemented
DataObject.prototype.publish = function( name){
  //return this.invokeDataSourceMethod("publish", this, name)
  var data = this.invokeDataSourceMethod("publish", this, name)
  return data
}


DataObject.prototype.action = function( action ){
  var root = this
  return function( params ){
    root.$$actions[action] = "executing"
    return root.invokeDataSourceMethod("action", action)(root, params).then(function(){
      root.$$actions[action] = "completed"
    })
  }
}


/*
 * status watchers
 */
DataObject.prototype.watch = function( name, handler ){
  if(_.isFunction(name) ){
    handler = name
    name = this.$$config.globalWatcherName
  }
  this.$$watchers[name] ?  this.$$watchers[name].push(handler) : (this.$$watchers[name] = [handler])
}

//TODO unwatch

//make it readable for status
DataObject.prototype.onStatus = DataObject.prototype.watch


//only save the last change attribute per attribute, when notify
//called, all changes will be cleared
DataObject.prototype.saveChanges = function( change ){
  this.$$changes[change.name] = change
}

//change : {name, obj, type, oldValue}
DataObject.prototype.notify = function(){
  var root = this
  _.forEach(root.$$changes, function( change, prop ){
      root.dispatchChange( change, prop)
      delete root.$$changes[change.name]
  })

  //notify all listeners listened on whole object
  root.dispatchChange( {}, root.$$config.globalWatcherName )
}

DataObject.prototype.dispatchChange = function( change, prop){
  var root = this
  prop = prop || change.name


  root.$$watchers[prop] && root.$$watchers[prop].forEach(function( handler ) {
    handler( root[prop], change.oldValue)
  })
}

//TODO user Object.observe as advanced usage


module.exports = DataObject
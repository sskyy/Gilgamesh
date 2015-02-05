var util = require("./util.js")

//utilities

function setRef( obj, attr, data){
  return (new Function("obj","data","return obj."+attr +"=data"))(obj,  data)
}

function getRef(obj, attr){
  return (new Function("obj","data","return obj."+attr ))(obj)
}


function DataObject( config ){
  var root = this

  util.forEach(["$$dirty","$$filled","$$validated", "$$empty", "$$validating", "$$saving" , "$$saved","$$deleting","$$deleted"],function(key){
    root.definePrivateProp(key, false)
  })

  util.forEach(["$$watchers","$$changes","$$actions"],function(key){
    root.definePrivateProp(key, {})
  })

  root.definePrivateProp("$$config",util.defaults( config,{
    globalWatcherName : "/"
  }))

}


DataObject.prototype.set =function(obj){
  for( var i in this){
    if( this.hasOwnProperty(i)) delete this[i]
  }
  util.extend( this, obj )
  this.changePropAndNotify("$$filled",true)
  return this
}

DataObject.prototype.destroy = function(){
  for( var i in this){
    delete this[i]
  }
  for( var j in this.$$watchers){
    delete this.$$watchers[j]
  }
  this.changePropAndNotify("$$destroy",true)
}

DataObject.prototype.definePrivateProp = function( prop, initial ){
  Object.defineProperty(this, prop, {
    value: initial,
    enumerable : false,
    writable: true,
    configurable: false
  })
}

DataObject.prototype.changePropAndNotify = function( prop, val ){
  var oldValue = getRef(this,prop)
  setRef(this,prop,val)

  this.dispatchChange({value: getRef( this,prop), name:prop,oldValue:oldValue},prop)
  //notify all global listener
  this.dispatchChange( {value: getRef( this,prop), name:prop,oldValue:oldValue}, this.$$config.globalWatcherName )
}

DataObject.prototype.toObject = function(){
  var obj = {}
  for( var i in this ){
    if( this.hasOwnProperty(i)){
      obj[i] = util.cloneDeep( this[i] )
    }
  }
  return obj
}

/*
 * instance methods
 */
DataObject.prototype.invokeDataSourceMethod = function( method ){
  var args = util.toArray(arguments).slice(1)
  if( !this.$$config.dataSource[method] ) return  console.log( "DataSource method", method, "not passed in")

  return this.$$config.dataSource[method].apply( this.$$config.dataSource, args)
}

DataObject.prototype.publish = function( name){
  //return this.invokeDataSourceMethod("publish", this, name)
  return this.invokeDataSourceMethod("publish", this, name)
}

DataObject.prototype.receiveObject = function( name){
  return this.invokeDataSourceMethod("receiveObject", name)
}

DataObject.prototype.receive = function( name){
  return this.invokeDataSourceMethod("receive", name)
}

DataObject.prototype.receiveArray = function( name){
  return this.invokeDataSourceMethod("receiveArray",  name)
}

DataObject.prototype.singular = function( doNotWatch ){
  //return this.invokeDataSourceMethod("publish", this, name)
  return this.invokeDataSourceMethod("singular", this, doNotWatch )
}


DataObject.prototype.action = function( action ){
  var root = this
  return function( params ){
    root.changePropAndNotify("$$actions."+action, "executing")
    return root.invokeDataSourceMethod("action", action)(root, params).then(function(res){
      root.changePropAndNotify("$$actions."+action, "succeed")
      return res
    },function(res){
      root.changePropAndNotify("$$actions."+action, "failed")
      return res
    })
  }
}

DataObject.prototype.clone = function(){
  return this.$$config.dataSource.new( this.toObject() )
}

//quick methods
DataObject.prototype.save = function(params){
  return this.action("save")(params)
}

DataObject.prototype.delete = function(){
  return this.action("delete")()
}

//may used as  refresh
DataObject.prototype.get = function( params ){
  this.changePropAndNotify("$$filled", false)

  if( params === true ){
    params = {}
    params[this.$$config.dataSource.pk] = this[this.$$config.dataSource.pk]
  }
  this.$$config.dataSource.get( params, this)
}


/*
 * status watchers
 */
DataObject.prototype.watch = function( name, handler ){
  if(util.isFunction(name) ){
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
  util.forEach(root.$$changes, function( change, prop ){
      root.dispatchChange( change, prop)
      delete root.$$changes[change.name]

    //notify all listeners listened on whole object
    root.dispatchChange( change, root.$$config.globalWatcherName )
  })


}

DataObject.prototype.dispatchChange = function( change, prop){
  var root = this

  root.$$watchers[prop] && root.$$watchers[prop].forEach(function( handler ) {
    //TODO should change pop up?
    handler( change.value , change.oldValue, change)
  })
}


module.exports = DataObject
var _  = require("lodash")
var DataObject  = require("./DataObject.js")
var DataArray = require("./DataArray")
var $ = require("../libs/jquery-1.11.1.min.js")

function DataSource( name, def ){
  _.extend( this, _.defaults( def, {
    url : {
      collection : "/" + name+"/{action}",
      single: "/" + name+"/{id}/{action}"
    },
    pk : "id" //allow array
  }))
}

DataSource.prototype.query = function( settings ){
  return $.ajax(settings)
}

DataSource.prototype.parse = function( data ){
  return data
}

DataSource.prototype.interpolate = function( text, obj ){
  return text.replace(/(\{\w+\})/g, function( m ){ return obj[m.slice(1,m.length-1)] || "" })
}

DataSource.prototype.makeUrl = function( params ){
  return this.interpolate( this.hasPrimaryKey(params )? this.url.single : this.url.collection, params).replace(/\/$/,"")
}


DataSource.prototype.hasPrimaryKey = function( params ){
  return !_.isObject( params ) || _.difference( [].concat(this.pk),  Object.keys(params)).length == 0
}


//we need to extract primary key from params
DataSource.prototype.makeQuery = function( params){
  var result = _.clone(_.isObject(params)?params:{})
  _.forEach([].concat(this.pk), function(r){
      delete result[r]
    })
  return result
}

DataSource.prototype.makeData = function( data ){
  var result = _.cloneDeep(data)
  _.forEach(result, function(v, k){
    if( /^\$\$/.test(k) ) delete result[k]
  })
  return result
}


DataSource.prototype.setupInstanceMethod = function( instance ){
  var root = this
  _.forEach(["save","delete","validate"],function( method ){
    instance[method] = root[method].bind(root,instance)
  })
  return instance
}

DataSource.prototype.save = function( instance ){
  var root = this
  instance.$$saving = true
  instance.$$saved = false
  instance.notify()
  this.query({
    url:root.makeUrl(instance),
    type: root.hasPrimaryKey(instance) ? "PUT" : "POST",
    data : root.makeData(instance)
  }).then(function(){
    instance.$$saved = true
  }).finally(function(){
    instance.$$saving = false
    instance.notify()
  })
}

DataSource.prototype.delete = function( instance){
  var root = this
  instance.$$deleting = true
  instance.$$deleted = false
  this.query({
    url:root.makeUrl(instance),
    type: "DELETE"
  }).then(function(){
    instance.$$deleted = true
  }).finally(function(){
    instance.$$deleting = false
    instance.notify()
  })
}

DataSource.prototype.validate = function(instance){
  instance.$$validating = false
  instance.$$validated = true
  instance.notify()
}

DataSource.prototype.get = function( params ){
  params = params ? (_.isObject(params) ? params : _.zipObject([this.pk],[params]) ) : {}

  var root = this
  var result = this.setupInstanceMethod( this.hasPrimaryKey(params) ? new DataObject : new DataArray )

  this.query( {url:this.makeUrl(params),type:"GET",data:this.makeQuery(params)} ).then(function( res ){
    result.set( root.parse( res ) )
    result.notify()
  })

  return result
}

DataSource.prototype.publish = function( name ){

}

DataSource.prototype.receive = function(name){

}

DataSource.prototype.exec = function( action ){

}

module.exports = DataSource
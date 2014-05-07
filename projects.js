var projects = {};

exports.getProjectModel = function(){
  var project = {
    short_url : null,
    closed    : false,
    active    : false,
    pages     : {},
    created_on: null,
  };
  return JSON.parse(JSON.stringify(project));
};

exports.getOne = function (key){
  if(projects[key] != 'undefined'){
    return projects[key];
  } else {
    return null;
  }
};

exports.add = function (p){
  projects[p.short_url] = p;
};

exports.update = function (project){
  projects[project.short_url] = project;
}
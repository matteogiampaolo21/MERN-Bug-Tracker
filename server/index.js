require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const BugModel = require("./models/Bugs");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require("cors");
const UserModel = require("./models/Users");
const ProjectModel = require("./models/Projects")


const app = express()
app.use(express.json())
app.use(express.urlencoded( {extended: true} ));
app.use(express.static(__dirname+'/public'));
app.set('view engine', 'ejs');

app.use(cors());

// mongoose.connect(process.env.MONGOOSEURL)
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGOOSEURL, () => {
  console.log("Connected to MongoDB");
});


// ####################################
// ####################################
// ####################################
// ####################################

app.post("/login", async function(req,res){
    const user = await UserModel.findOne({email: req.body.email,});

    if(!user) {
        return {status:"error",error:"Invalid login"}
    }

    const isPasswordEqual = await bcrypt.compare(
		req.body.password,
		user.password
	)

    if (isPasswordEqual){
        const token = jwt.sign(
			{
                _id: user._id,
				fname: user.fname,
                lname: user.lname,
				email: user.email,
			},
			process.env.SECRET
		)

		return res.json({ status: 'ok', user: token })
    }else{
        return res.json({ status: 'error', user: false })
    }
})

app.post('/register', async (req, res) => {


	console.log(req.body)
	try {
		const reqUser = (req.body.newUserDoc)
        const cryptPassword = await bcrypt.hash(reqUser.password, 2)
        const newUser = new UserModel({
            fname: reqUser.fname,
            lname: reqUser.lname,
            email: reqUser.email,
            password: cryptPassword
        });
        await newUser.save();
		res.json({ status: 'ok' })
	} catch (err) {
		res.json({ status: 'error', error: 'Duplicate email' })
	}
}) 

app.get('/getProjects', async (req, res) => {

	const token = req.headers['x-access-token']
	try {
		const decoded = jwt.verify(token, process.env.SECRET)
		const email = decoded.email
		const projects = await ProjectModel.find({ addedUsers: email })
        const user = await UserModel.findOne({email:email})

        
		return res.json({ status: 'ok', projDoc: projects , user: user})
	} catch (error) {
		console.log(error)
		res.json({ status: 'error', error: 'invalid token' })
	}

})

// ###############################################
// ###############################################
// ###############################################


app.post("/addUser",function(req,res){
    const requestedUser = req.body.requestedUser;
    const projectID = req.body.projectID;
    ProjectModel.findOneAndUpdate({"_id": projectID},
        {"$push": {"addedUsers": requestedUser}},
        function(err,results){
            if (err){
                console.log(err)
            }else{
                res.json(results)
            }
    })
})

app.post("/deleteUser",function(req,res){
    const requestedUser = req.body.requestedUser;
    const projectID = req.body.projectID;
    ProjectModel.findOneAndUpdate({"_id": projectID},
        {"$pull": {"addedUsers": requestedUser}},
        function(err,results){
            if (err){
                console.log(err)
            }else{
                res.json(results)
            }
    })

})

app.post("/createProject",function(req,res){
    const projectObject = (req.body);

    const newProject = new ProjectModel({
        projectName:projectObject.name,
        projectOwner:projectObject.owner,
        addedUsers: [projectObject.owner]
    });
    newProject.save();
    res.json({status: true})


})

app.post("/deleteProject",function(req,res){
    const projectID = req.body.projectID;
    ProjectModel.findOneAndDelete({"_id":projectID},function(err,results){
        if (err){
            console.log(err);
        }else{
            return;
        }
    })
})

app.post("/getUserProjects", function(req,res){
    const email = (req.body.userEmail)
    ProjectModel.find({addedUsers: email },function(err, results){
        res.json(results)
    })
})

app.post("/getSingleProject",function(req,res){
    const projectID = (req.body.projectID)
    ProjectModel.findById(projectID,function(err, results){
        res.json(results)
    })
})

app.post("/createBug",function(req,res){
    const bugObject = (req.body);
    const projectID = bugObject.currentProjID._id
    const newTicket = {"bugName":bugObject.Name, "bugStatus":bugObject.Status, "bugText":bugObject.Text, "bugPriority":bugObject.Priority}

    ProjectModel.findOneAndUpdate({"_id": projectID},
        {"$push": {"projectBugs": newTicket}},
        function(err,results){
            if (err){
                console.log(err)
            }else{
                res.json(results)
            }
    })
    
});

app.post("/completeBug",function(req,res){
    const userEmail = req.body.userEmail;
    const projectID = req.body.projectID;
    const selectedBug = req.body.finishedBug;
    const bug = {_id:selectedBug._id,bugName:selectedBug.bugName,bugWorker:userEmail,bugText:selectedBug.bugText,bugPriority:selectedBug.bugPriority};
    
    ProjectModel.findOneAndUpdate({"_id": projectID},
        {"$push": {"completedBugs": bug}},
        function(err,results){
            if (err){
                console.log(err)
            }else{
                res.json(results)
            }
    })

    ProjectModel.updateOne({_id:projectID}, 
        {"$pull":{ "projectBugs":{"_id":selectedBug._id}}},
        function(err,results){
            if (err){
                console.log(err)
            }else{

            }
    })

})

app.post("/removeCompletedBug", function(req,res){
    const requestedBugID = req.body.bugID;
    const requestedProjID = req.body.projectID;

    ProjectModel.updateOne({_id:requestedProjID}, 
        {"$pull":{ "completedBugs":{"_id":requestedBugID}}},
        function(err,results){
            if (err){
                console.log(err)
            }else{
                res.json(results)
            }
    })
})


app.post("/deleteBug", function(req,res){
    const requestedBugID = req.body.bugID;
    const requestedProjID = req.body.projectID;

    ProjectModel.updateOne({_id:requestedProjID}, 
        {"$pull":{ "projectBugs":{"_id":requestedBugID}}},
        function(err,results){
            if (err){
                console.log(err)
            }else{
                res.json(results)
            }
    })

})



app.post("/changeBug",function(req,res){
    const bugID = req.body.bugID;

    const editedBug = (req.body.editNewObject);

    ProjectModel.updateOne({"projectBugs._id" : bugID},{"$set" : {
        "projectBugs.$.bugName": editedBug.nameTick,
        "projectBugs.$.bugStatus": editedBug.statTick,
        "projectBugs.$.bugText": editedBug.textTick,
        "projectBugs.$.bugPriority": editedBug.priorTick
     }},function(err,results){
        if (err){
            console.log(err);
        }else{
            res.json(results);
        }
     })
       


});

app.listen(3001,function(){
    console.log("Server is running succesfully on port: 3001")
})
const Feedback = require("../models/Feedback");


const createFeedback = async (req, res) => {

  try {

    const { message } = req.body;


    // Validation
    if (!message || message.trim() === "") {

      return res.status(400).json({
        success: false,
        message: "Feedback message is required",
      });

    }


    // Create feedback

    const feedback = await Feedback.create({

      userId: req.user.id,
      message: message.trim(),

    });



    return res.status(201).json({

      success: true,
      message: "Feedback submitted successfully",
      feedback,

    });


  } catch (error) {

    console.log("Create Feedback Error:", error);


    return res.status(500).json({

      success: false,
      message: "Internal Server Error",

    });

  }

};


module.exports = {
  createFeedback,
};
/**
 * User schema — covers all three roles: student, employer, admin.
 * Passwords are hashed via a pre-save hook; comparison is a model method.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const academicRecordSchema = new mongoose.Schema({
  qualification : String,
  institute     : String,
  passingYear   : String,
  gradeOrScore  : String,
});

const workHistorySchema = new mongoose.Schema({
  designation  : String,
  organisation : String,
  tenure       : String,
  summary      : String,
});

const userSchema = new mongoose.Schema(
  {
    fullName : {
      type    : String,
      required: [true, 'Full name is required'],
      trim    : true,
    },
    emailAddress : {
      type     : String,
      required : [true, 'Email address is required'],
      unique   : true,
      lowercase: true,
      trim     : true,
    },
    hashedPassword : {
      type     : String,
      required : [true, 'Password is required'],
      minlength: 6,
      select   : false,
    },
    accountRole : {
      type   : String,
      enum   : ['student', 'employer', 'admin'],
      default: 'student',
    },
    preferredLanguage : {
      type   : String,
      enum   : ['en', 'es', 'hi', 'pt', 'zh', 'fr'],
      default: 'en',
    },

    /* ── Student-specific ── */
    contactNumber  : String,
    cityOrRegion   : String,
    aboutMe        : String,
    skillSet       : [String],
    cvFileUrl      : String,
    cvPublicId     : String,
    avatarUrl      : String,
    academicHistory: [academicRecordSchema],
    workExperience : [workHistorySchema],
    bookmarkedJobs : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],

    /* ── Employer-specific ── */
    organisationName   : String,
    organisationSite   : String,
    organisationAbout  : String,
    organisationLogo   : String,
    sector             : String,
    headcount          : String,

    isVerified : { type: Boolean, default: false },
    isActive   : { type: Boolean, default: true  },

    /* ── Password reset rate-limit ── */
    passwordResetUsedAt : { type: Date, default: null },
  },
  { timestamps: true }
);

/* Hash password only when it changes */
userSchema.pre('save', async function (next) {
  if (!this.isModified('hashedPassword')) return next();
  const rounds = 12;
  this.hashedPassword = await bcrypt.hash(this.hashedPassword, rounds);
  next();
});

/* Instance method for login verification */
userSchema.methods.verifyPassword = async function (plainText) {
  return bcrypt.compare(plainText, this.hashedPassword);
};

module.exports = mongoose.model('User', userSchema);

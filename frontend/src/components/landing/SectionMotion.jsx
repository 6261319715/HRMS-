import { motion } from "framer-motion";

const SectionMotion = ({ children, className = "", ...rest }) => {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      {...rest}
    >
      {children}
    </motion.section>
  );
};

export default SectionMotion;

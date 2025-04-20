import { useState, useCallback, useEffect } from 'react';

interface ValidationRules {
  [key: string]: {
    required?: boolean;
    pattern?: RegExp;
    validate?: (value: any, allValues?: any) => boolean;
    message: string;
  }[];
}

interface FieldErrors {
  [key: string]: string;
}

interface FormState {
  [key: string]: any;
}

interface FieldStates {
  [key: string]: {
    touched: boolean;
    valid: boolean;
  };
}

export interface UseFormValidationResult {
  errors: FieldErrors;
  isValid: boolean;
  validateField: (name: string, value: any) => string | null;
  validateAllFields: () => boolean;
  handleBlur: (name: string) => void;
  resetField: (name: string) => void;
  resetForm: () => void;
  setFieldError: (name: string, error: string | null) => void;
  touchedFields: string[];
}

const useFormValidation = (
  formState: FormState,
  validationRules: ValidationRules
): UseFormValidationResult => {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [fieldStates, setFieldStates] = useState<FieldStates>({});
  const [isValid, setIsValid] = useState(false);

  // Initialize field states
  useEffect(() => {
    const initialFieldStates: FieldStates = {};
    Object.keys(validationRules).forEach((field) => {
      initialFieldStates[field] = {
        touched: false,
        valid: true
      };
    });
    setFieldStates(initialFieldStates);
  }, [validationRules]);

  const validateField = useCallback(
    (name: string, value: any): string | null => {
      if (!validationRules[name]) return null;

      for (const rule of validationRules[name]) {
        // Check required
        if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
          return rule.message;
        }

        // Skip other validations if value is empty and not required
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          continue;
        }

        // Check regex pattern
        if (rule.pattern && !rule.pattern.test(value)) {
          return rule.message;
        }

        // Check custom validation function
        if (rule.validate && !rule.validate(value, formState)) {
          return rule.message;
        }
      }

      return null;
    },
    [formState, validationRules]
  );

  const validateAllFields = useCallback((): boolean => {
    const newErrors: FieldErrors = {};
    let formValid = true;
    const newFieldStates = { ...fieldStates };

    Object.keys(validationRules).forEach((fieldName) => {
      const value = formState[fieldName];
      const errorMessage = validateField(fieldName, value);
      
      if (errorMessage) {
        newErrors[fieldName] = errorMessage;
        formValid = false;
        
        newFieldStates[fieldName] = {
          ...newFieldStates[fieldName],
          touched: true,
          valid: false
        };
      } else {
        newFieldStates[fieldName] = {
          ...newFieldStates[fieldName],
          touched: true,
          valid: true
        };
      }
    });

    setErrors(newErrors);
    setFieldStates(newFieldStates);
    setIsValid(formValid);
    return formValid;
  }, [formState, validateField, validationRules, fieldStates]);

  const handleBlur = useCallback(
    (name: string) => {
      const newFieldStates = { ...fieldStates };
      newFieldStates[name] = {
        ...newFieldStates[name],
        touched: true
      };
      setFieldStates(newFieldStates);

      const errorMessage = validateField(name, formState[name]);
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: errorMessage
      }));

      // Update isValid state
      const hasErrors = Object.values({ ...errors, [name]: errorMessage }).some(
        (error) => error !== null && error !== undefined
      );
      setIsValid(!hasErrors);
    },
    [errors, fieldStates, formState, validateField]
  );

  const resetField = useCallback(
    (name: string) => {
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      });

      setFieldStates((prevStates) => ({
        ...prevStates,
        [name]: { touched: false, valid: true }
      }));

      // Update isValid state after resetting a field
      setTimeout(() => {
        const hasErrors = Object.values(errors).some(
          (error) => error !== null && error !== undefined
        );
        setIsValid(!hasErrors);
      }, 0);
    },
    [errors]
  );

  const resetForm = useCallback(() => {
    setErrors({});
    
    const resetStates: FieldStates = {};
    Object.keys(fieldStates).forEach((field) => {
      resetStates[field] = { touched: false, valid: true };
    });
    
    setFieldStates(resetStates);
    setIsValid(true);
  }, [fieldStates]);

  const setFieldError = useCallback((name: string, error: string | null) => {
    setErrors(prevErrors => {
      if (!error) {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      }
      
      return {
        ...prevErrors,
        [name]: error
      };
    });

    // Update field state
    setFieldStates(prevStates => ({
      ...prevStates,
      [name]: {
        ...prevStates[name],
        touched: true,
        valid: !error
      }
    }));

    // Update global validity
    setTimeout(() => {
      setIsValid(Object.keys(errors).length === 0);
    }, 0);
  }, [errors]);

  // Calculate touched fields for rendering
  const touchedFields = Object.entries(fieldStates)
    .filter(([_, state]) => state.touched)
    .map(([field]) => field);

  return {
    errors,
    isValid,
    validateField,
    validateAllFields,
    handleBlur,
    resetField,
    resetForm,
    setFieldError,
    touchedFields
  };
};

export default useFormValidation;